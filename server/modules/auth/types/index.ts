// Simple auth route type definitions for categorized integration
import { Router } from 'express';

// Type definitions for the three categorized auth route modules
export type AuthRoutesGlobal = Router;
export type AuthRoutesAdmin = Router;
export type AuthRoutesDevelopment = Router;