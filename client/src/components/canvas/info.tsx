import { CanvasData } from "@/views/canvas";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Area } from "@/components/canvas/area";
import {
  Check,
  Loader2,
  Clock,
  ChevronDown,
  SidebarClose,
  SidebarOpen,
} from "lucide-react";

interface InfoProps {
  lesson: CanvasData;
}

const statusColors = {
  completed: "text-green-500 bg-green-50",
  current: "text-blue-500 bg-blue-50",
  pending: "text-gray-400 bg-gray-50",
};

export function Info({ lesson }: InfoProps) {
  const [isSideOpen, setIsSideOpen] = useState(true);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const lastProcessedStep = (lesson.steps?.length ?? 0) - 1;

  const handleItemClick = (title: string | undefined) => {
    if (title) {
      setExpandedItem(expandedItem === title ? null : title);
    }
  };

  function getItemStatus(index: number) {
    if (index <= lastProcessedStep) return "completed";
    if (index === lastProcessedStep + 1) return "current";

    return "pending";
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-lg p-4 min-h-full relative">
          <Button
            className="absolute top-4 right-4 p-2"
            onClick={() => setIsSideOpen(!isSideOpen)}
          >
            {isSideOpen ? <SidebarOpen /> : <SidebarClose />}
          </Button>
          <Area lesson={lesson} />
        </div>
      </div>

      <motion.div
        className="bg-white shadow-lg h-full border-l"
        initial={{ width: 480 }}
        animate={{ width: isSideOpen ? 480 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="w-[480px] h-full p-6">
          <div className="flex justify-between items-start mb-8">
            <button
              onClick={() => setIsSideOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full"
            >
              ✕
            </button>

            <div className="flex flex-col gap-4">
              {lesson.title ? (
                <h1 className="text-2xl font-bold">{lesson.title}</h1>
              ) : (
                <div className="w-60 h-10 bg-gray-200 rounded-lg animate-pulse" />
              )}
              {lesson.description ? (
                <p className="text-gray-600 leading-relaxed">
                  {lesson.description}
                </p>
              ) : (
                <div className="w-72 h-10 bg-gray-200 rounded-lg animate-pulse" />
              )}
            </div>
          </div>
          <div className="space-y-3">
            {lesson.outline ? (
              <ul className="space-y-3">
                {lesson.outline.map((item, key) => {
                  const status = getItemStatus(key);
                  return (
                    <motion.li
                      key={item.title}
                      className={`w-full rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-cyan-200 transition-colors ${
                        expandedItem === item.title
                          ? "bg-cyan-50"
                          : "bg-gray-50 hover:bg-blue-50/50"
                      }`}
                      onClick={() => handleItemClick(item.title)}
                    >
                      <div className="p-5 flex items-center gap-4">
                        <div
                          className={`p-2.5 rounded-full ${statusColors[status]}`}
                        >
                          {status === "completed" ? (
                            <Check className="w-4 h-4" />
                          ) : status === "current" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <span className="flex-1 font-medium">{item.title}</span>
                        <motion.div
                          animate={{
                            rotate: expandedItem === item.title ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                          className={`${
                            expandedItem === item.title
                              ? "text-cyan-100"
                              : "text-gray-400"
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                      <AnimatePresence>
                        {expandedItem === item.title && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-5 pb-5"
                          >
                            {item.prompt && (
                              <p className="text-gray-600 text-sm pl-[52px] leading-relaxed">
                                {item.prompt}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </ul>
            ) : (
              <ul className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <li
                    key={index}
                    className="w-full h-18 bg-gray-200 rounded-lg animate-pulse"
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
