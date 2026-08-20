import type { User } from "../context/AuthProvider";

export interface EmailLoginRequestResponse {
  masked_email: string;
}

export interface EmailLoginVerifyResponse {
  access: string;
  user: User;
  password_setup_required: boolean;
}

export interface EmailLoginError {
  error: string;
  code?: string; // "no_email" | "cooldown" | "expired" | "too_many_attempts" | "invalid_code" | "invalid"
  retry_after?: number; // seconds, on 429
  attempts_left?: number; // on a wrong code
}
