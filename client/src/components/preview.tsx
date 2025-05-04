import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { ComposerRef } from "./composer";

interface PreviewProps {
  title?: string;
  description?: string;
  onClick?: () => void;
  composerRef?: React.RefObject<ComposerRef | null>;
}

export function Preview({
  title,
  description,
  onClick,
  composerRef,
}: PreviewProps) {
  const isEmpty = !title && !description;

  function handleClick() {
    if (isEmpty && composerRef?.current) {
      composerRef.current.focus();
    }
    onClick?.();
  }

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="w-64 h-48 bg-white rounded-lg shadow-md flex items-center justify-center p-4 cursor-pointer hover:shadow-lg transition-shadow"
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-gray-600 transition-colors">
          <Plus size={32} />
        </div>
      ) : (
        <div className="w-full">
          <h2 className="font-semibold text-lg text-gray-800 truncate">
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      )}
    </motion.article>
  );
}
