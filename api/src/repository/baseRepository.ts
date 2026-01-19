type OrderByInput = Record<string, "asc" | "desc">;

interface BaseModel<T> {
    create(args: { data: T }): Promise<T>;
    findUnique(args: { where: { id: string } }): Promise<T | null>;
    findMany(args?: { skip?: number; take?: number; orderBy?: OrderByInput }): Promise<T[]>;
    update(args: { where: { id: string }; data: Partial<T> }): Promise<T>;
    delete(args: { where: { id: string } }): Promise<T>;
}

export class BaseRepository<T> {
    private model: BaseModel<T>;

    constructor(model: BaseModel<T>) {
        this.model = model;
    }

    async create(data: T): Promise<T> {
        return this.model.create({ data });
    }

    async findById(id: string): Promise<T | null> {
        return this.model.findUnique({ where: { id } });
    }

    async findAll(options?: { skip?: number; take?: number; orderBy?: OrderByInput }): Promise<T[]> {
        return this.model.findMany({
            ...(options?.skip !== undefined ? { skip: options.skip } : {}),
            ...(options?.take !== undefined ? { take: options.take } : {}),
            ...(options?.orderBy ? { orderBy: options.orderBy } : {}),
        });
    }

    async update(id: string, data: Partial<T>): Promise<T> {
        // Remover campos inválidos como `undefined` e ajustar relacionamentos
        const sanitizedData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
        ) as Partial<T>;
        return this.model.update({
            where: { id },
            data: sanitizedData,
        });
    }

    async delete(id: string): Promise<T> {
        return this.model.delete({ where: { id } });
    }
}
