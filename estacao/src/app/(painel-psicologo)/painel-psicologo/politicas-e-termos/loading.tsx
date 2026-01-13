export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9F9F6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9]"></div>
        <p className="text-[#49525A] text-sm">Carregando políticas e termos...</p>
      </div>
    </div>
  );
}

