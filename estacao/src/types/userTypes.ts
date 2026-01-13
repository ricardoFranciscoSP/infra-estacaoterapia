export interface OnboardingStep {
    id: string;
    title: string;
    completed: boolean;
    order: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role?: string;
    Address?: Array<Record<string, unknown>>;
}

export interface Onboarding {
    id: string;
    userId: string;
    Completed: boolean;
    Step: OnboardingStep[];
}

export interface UserStore {
    user: User;
    Onboardings: Onboarding[] | null;
    setUser: (user: User) => void;
    setOnboarding: (onboardings: Onboarding[] | null) => void;
}
