import { HttpStatus } from "@nestjs/common";

export interface DomainErrorOptions {
	readonly code: string;
	readonly message: string;
	readonly status?: HttpStatus;
	readonly details?: unknown;
}

export class DomainError extends Error {
	readonly code: string;
	readonly details?: unknown;
	readonly statusCode: HttpStatus;

	constructor({ code, message, status = HttpStatus.BAD_REQUEST, details }: DomainErrorOptions) {
		super(message);
		this.name = new.target.name;
		this.code = code;
		this.statusCode = status;
		this.details = details;
	}
}

export class DomainValidationError extends DomainError {
	constructor(code: string, message: string, details?: unknown) {
		super({ code, message, status: HttpStatus.BAD_REQUEST, details });
	}
}

export class DomainConflictError extends DomainError {
	constructor(code: string, message: string, details?: unknown) {
		super({ code, message, status: HttpStatus.CONFLICT, details });
	}
}

export class DomainNotFoundError extends DomainError {
	constructor(code: string, message = "Resource not found", details?: unknown) {
		super({ code, message, status: HttpStatus.NOT_FOUND, details });
	}
}

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
