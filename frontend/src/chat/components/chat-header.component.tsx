interface ChatHeaderProps {
  title?: string;
}

export function ChatHeader({ title = 'Chat' }: ChatHeaderProps) {
  return (
    <header className="border-b px-6 py-4">
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
