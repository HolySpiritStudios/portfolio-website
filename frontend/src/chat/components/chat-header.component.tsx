import { FiHome } from 'react-icons/fi';
import { useNavigate } from 'react-router';

import { PathEnum } from '../../main/constants/path.constant';

interface ChatHeaderProps {
  title?: string;
}

export function ChatHeader({ title = 'Chat' }: ChatHeaderProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(PathEnum.HOME);
  };

  return (
    <header className="flex items-center gap-4 border-b px-6 py-4">
      <button
        onClick={handleBackClick}
        className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Go to home"
      >
        <FiHome className="h-6 w-6" />
      </button>
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
