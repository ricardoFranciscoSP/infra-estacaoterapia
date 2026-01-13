/**
 * ============================================================================
 * COMPONENTE: Avatar de Usuário
 * ============================================================================
 * 
 * Exibe avatar do usuário com renovação automática de URL
 * Suporta diferentes tamanhos e fallback
 */

import { useDocumentStore } from '@/store/useDocumentStore';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface UserAvatarProps {
    userId: string;
    size?: number;
    fullSize?: boolean;
    userName?: string;
    className?: string;
}

export function UserAvatar({ 
    userId, 
    size = 150, 
    fullSize = false,
    userName,
    className = '' 
}: UserAvatarProps) {
    const getUserAvatar = useDocumentStore(state => state.getUserAvatar);
    const getUserAvatarFull = useDocumentStore(state => state.getUserAvatarFull);

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const loadAvatar = async () => {
            setLoading(true);
            setError(false);

            try {
                const url = fullSize 
                    ? await getUserAvatarFull(userId)
                    : await getUserAvatar(userId, size);

                setAvatarUrl(url);
            } catch (err) {
                console.error('Erro ao carregar avatar:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        loadAvatar();
    }, [userId, size, fullSize, getUserAvatar, getUserAvatarFull]);


    // Função para gerar cor de fundo baseada no userId
    // const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // return colors[hash % colors.length];

    const avatarSize = `${size}px`;
    // const bgColor = getBackgroundColor(userId);

    if (loading) {
        return (
            <div
                className={`rounded-full bg-gray-200 animate-pulse ${className}`}
                style={{ width: avatarSize, height: avatarSize }}
            />
        );
    }

    if (error || !avatarUrl) {
        // Fallback: usa o placeholder SVG quando não houver imagem cadastrada
        return (
            <Image
                src="/assets/avatar-placeholder.svg"
                alt={userName || 'Avatar padrão'}
                width={size}
                height={size}
                className={`rounded-full object-cover ${className}`}
                style={{ width: avatarSize, height: avatarSize }}
            />
        );
    }

    return (
        <Image
            src={avatarUrl}
            alt={userName || 'Avatar do usuário'}
            width={size}
            height={size}
            className={`rounded-full object-cover ${className}`}
            style={{ width: avatarSize, height: avatarSize }}
            onError={() => setError(true)}
        />
    );
}

/**
 * ============================================================================
 * EXEMPLO DE USO
 * ============================================================================
 * 
 * // Avatar pequeno (padrão)
 * <UserAvatar userId="user-123" userName="João Silva" />
 * 
 * // Avatar grande
 * <UserAvatar userId="user-123" userName="João Silva" size={200} />
 * 
 * // Avatar tamanho completo (sem redimensionamento)
 * <UserAvatar userId="user-123" userName="João Silva" fullSize />
 * 
 * // Avatar com classe personalizada
 * <UserAvatar 
 *   userId="user-123" 
 *   userName="João Silva" 
 *   size={100}
 *   className="border-4 border-white shadow-lg"
 * />
 */


/**
 * ============================================================================
 * COMPONENTE: Lista de Avatares (exemplo de múltiplos usuários)
 * ============================================================================
 */

interface User {
    id: string;
    name: string;
    role?: string;
}

interface UserAvatarListProps {
    users: User[];
    size?: number;
    max?: number;
}

export function UserAvatarList({ users, size = 40, max = 5 }: UserAvatarListProps) {
    const displayUsers = users.slice(0, max);
    const remaining = Math.max(0, users.length - max);

    return (
        <div className="flex items-center -space-x-2">
            {displayUsers.map((user) => (
                <div key={user.id} className="relative group">
                    <UserAvatar
                        userId={user.id}
                        userName={user.name}
                        size={size}
                        className="border-2 border-white hover:z-10 transition-transform hover:scale-110"
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {user.name}
                        {user.role && <span className="text-gray-400"> • {user.role}</span>}
                    </div>
                </div>
            ))}
            
            {remaining > 0 && (
                <div
                    className="rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium border-2 border-white"
                    style={{ 
                        width: `${size}px`, 
                        height: `${size}px`,
                        fontSize: `${size * 0.35}px`
                    }}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
}

/**
 * ============================================================================
 * EXEMPLO DE USO - UserAvatarList
 * ============================================================================
 * 
 * const users = [
 *   { id: '1', name: 'João Silva', role: 'Admin' },
 *   { id: '2', name: 'Maria Santos', role: 'Psicólogo' },
 *   { id: '3', name: 'Pedro Costa', role: 'Paciente' },
 *   // ... mais usuários
 * ];
 * 
 * <UserAvatarList users={users} size={50} max={3} />
 */
