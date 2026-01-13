import { UserPsicologo } from '../../types/user.psicologo.types';

export interface IUserPsicologoService {
    fetchUsersPsicologo(userId: string): Promise<UserPsicologo[]>;
    updateUserPsicologo(userId: string, data: Partial<UserPsicologo>): Promise<UserPsicologo | null>;
    uploadImage(userId: string, file: any): Promise<any>;
}
