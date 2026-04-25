import type { Plan } from "../entities/plan.entity";

export abstract class PlanRepository {
	abstract findAll(): Promise<Plan[]>;
	abstract findBySlug(slug: string): Promise<Plan | null>;
	abstract findById(id: string): Promise<Plan | null>;
}
