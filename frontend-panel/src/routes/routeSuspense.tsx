import { type ReactNode, Suspense } from "react";
import { AuthRouteFallback, PublicRouteFallback } from "@/router/RouteFallback";

export function publicElement(element: ReactNode) {
	return <Suspense fallback={<PublicRouteFallback />}>{element}</Suspense>;
}

export function authElement(element: ReactNode) {
	return <Suspense fallback={<AuthRouteFallback />}>{element}</Suspense>;
}
