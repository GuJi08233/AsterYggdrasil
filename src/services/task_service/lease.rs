use std::sync::Arc;
use std::time::{Duration as StdDuration, Instant};

use parking_lot::Mutex;
use tokio_util::sync::CancellationToken;

use crate::errors::{AsterError, Result};
use aster_forge_utils::numbers::i64_to_u64;

use super::{TASK_HEARTBEAT_INTERVAL_SECS, TASK_PROCESSING_STALE_SECS};

const TASK_LEASE_LOST_MESSAGE_PREFIX: &str = "background task lease lost";
const TASK_LEASE_RENEWAL_TIMEOUT_MESSAGE_PREFIX: &str = "background task lease renewal timed out";
const TASK_WORKER_SHUTDOWN_REQUESTED_MESSAGE_PREFIX: &str =
    "background task worker shutdown requested";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct TaskLease {
    pub(super) task_id: i64,
    pub(super) processing_token: i64,
}

impl TaskLease {
    pub(super) fn new(task_id: i64, processing_token: i64) -> Self {
        Self {
            task_id,
            processing_token,
        }
    }
}

#[derive(Debug, Clone)]
pub(super) struct TaskLeaseGuard {
    lease: TaskLease,
    renewal_timeout: StdDuration,
    shutdown_token: Option<CancellationToken>,
    state: Arc<Mutex<TaskLeaseGuardState>>,
}

#[derive(Debug)]
struct TaskLeaseGuardState {
    last_renewed_at: Instant,
    termination: Option<TaskLeaseTermination>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TaskLeaseTermination {
    Lost,
    RenewalTimedOut,
    ShutdownRequested,
}

impl TaskLeaseGuard {
    pub(super) fn new(lease: TaskLease) -> Self {
        Self::with_renewal_timeout(lease, task_lease_renewal_timeout())
    }

    pub(super) fn with_renewal_timeout(lease: TaskLease, renewal_timeout: StdDuration) -> Self {
        Self {
            lease,
            renewal_timeout,
            shutdown_token: None,
            state: Arc::new(Mutex::new(TaskLeaseGuardState {
                last_renewed_at: Instant::now(),
                termination: None,
            })),
        }
    }

    fn with_shutdown_token(lease: TaskLease, shutdown_token: CancellationToken) -> Self {
        Self {
            shutdown_token: Some(shutdown_token),
            ..Self::new(lease)
        }
    }

    pub(super) fn lease(&self) -> TaskLease {
        self.lease
    }

    pub(super) fn record_renewed(&self) {
        let mut state = self.state.lock();
        if state.termination.is_none() {
            state.last_renewed_at = Instant::now();
        }
    }

    pub(super) fn mark_lost(&self) -> AsterError {
        let mut state = self.state.lock();
        state.termination = Some(TaskLeaseTermination::Lost);
        task_lease_lost(self.lease)
    }

    fn mark_shutdown_requested(&self) -> AsterError {
        let mut state = self.state.lock();
        state.termination = Some(TaskLeaseTermination::ShutdownRequested);
        task_worker_shutdown_requested(self.lease)
    }

    pub(super) fn ensure_active(&self) -> Result<()> {
        let mut state = self.state.lock();
        match state.termination {
            Some(TaskLeaseTermination::Lost) => return Err(task_lease_lost(self.lease)),
            Some(TaskLeaseTermination::RenewalTimedOut) => {
                return Err(task_lease_renewal_timed_out(self.lease));
            }
            Some(TaskLeaseTermination::ShutdownRequested) => {
                return Err(task_worker_shutdown_requested(self.lease));
            }
            None => {}
        }
        if self
            .shutdown_token
            .as_ref()
            .is_some_and(CancellationToken::is_cancelled)
        {
            state.termination = Some(TaskLeaseTermination::ShutdownRequested);
            return Err(task_worker_shutdown_requested(self.lease));
        }
        if state.last_renewed_at.elapsed() >= self.renewal_timeout {
            state.termination = Some(TaskLeaseTermination::RenewalTimedOut);
            return Err(task_lease_renewal_timed_out(self.lease));
        }
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub(super) struct TaskExecutionContext {
    lease_guard: TaskLeaseGuard,
    shutdown_token: CancellationToken,
}

impl TaskExecutionContext {
    pub(super) fn new(lease: TaskLease, shutdown_token: CancellationToken) -> Self {
        Self {
            lease_guard: TaskLeaseGuard::with_shutdown_token(lease, shutdown_token.clone()),
            shutdown_token,
        }
    }

    pub(super) fn lease_guard(&self) -> &TaskLeaseGuard {
        &self.lease_guard
    }

    pub(super) fn ensure_active(&self) -> Result<()> {
        self.lease_guard.ensure_active()
    }

    pub(super) async fn sleep_or_shutdown(&self, duration: StdDuration) -> Result<()> {
        self.lease_guard.ensure_active()?;

        tokio::select! {
            biased;
            _ = self.shutdown_token.cancelled() => Err(self.lease_guard.mark_shutdown_requested()),
            _ = tokio::time::sleep(duration) => Ok(()),
        }
    }

    pub(super) async fn shutdown_requested(&self) -> Result<()> {
        self.shutdown_token.cancelled().await;
        Err(self.lease_guard.mark_shutdown_requested())
    }
}

pub(super) fn task_lease_lost(lease: TaskLease) -> AsterError {
    AsterError::internal_error(format!(
        "{TASK_LEASE_LOST_MESSAGE_PREFIX} for task #{} with token {}",
        lease.task_id, lease.processing_token
    ))
}

pub(super) fn task_lease_renewal_timed_out(lease: TaskLease) -> AsterError {
    AsterError::internal_error(format!(
        "{TASK_LEASE_RENEWAL_TIMEOUT_MESSAGE_PREFIX} for task #{} with token {}",
        lease.task_id, lease.processing_token
    ))
}

pub(super) fn task_worker_shutdown_requested(lease: TaskLease) -> AsterError {
    AsterError::internal_error(format!(
        "{TASK_WORKER_SHUTDOWN_REQUESTED_MESSAGE_PREFIX} for task #{} with token {}",
        lease.task_id, lease.processing_token
    ))
}

pub(super) fn is_task_lease_lost(error: &AsterError) -> bool {
    error.message().starts_with(TASK_LEASE_LOST_MESSAGE_PREFIX)
}

pub(super) fn is_task_lease_renewal_timed_out(error: &AsterError) -> bool {
    error
        .message()
        .starts_with(TASK_LEASE_RENEWAL_TIMEOUT_MESSAGE_PREFIX)
}

pub(super) fn is_task_worker_shutdown_requested(error: &AsterError) -> bool {
    error
        .message()
        .starts_with(TASK_WORKER_SHUTDOWN_REQUESTED_MESSAGE_PREFIX)
}

pub(super) fn task_lease_renewal_timeout() -> StdDuration {
    let stale_secs = i64_to_u64(
        TASK_PROCESSING_STALE_SECS.max(1),
        "task processing stale seconds",
    )
    .unwrap_or(u64::MAX);
    let heartbeat_secs = TASK_HEARTBEAT_INTERVAL_SECS.max(1);
    StdDuration::from_secs(stale_secs.saturating_sub(heartbeat_secs).max(1))
}
