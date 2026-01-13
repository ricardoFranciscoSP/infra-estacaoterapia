export class BaseRepository<T> {
    private model: any;

    constructor(model: any) {
        this.model = model;
    }

    async create(data: T): Promise<T> {
        return this.model.create({ data });
    }

    async findById(id: string): Promise<T | null> {
        return this.model.findUnique({ where: { id } });
    }

    async findAll(): Promise<T[]> {
        return this.model.findMany();
    }

    async update(id: string, data: Partial<T>): Promise<T> {
        // Remover campos inválidos como `undefined` e ajustar relacionamentos
        const sanitizedData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
        );
        return this.model.update({
            where: { id },
            data: sanitizedData,
        });
    }

    async delete(id: string): Promise<T> {
        return this.model.delete({ where: { id } });
    }
}
