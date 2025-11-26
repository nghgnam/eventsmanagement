export type ResponseData<D> = {
    event: D[] | D;
    message: string;
    status: number;
}