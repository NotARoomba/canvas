import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, GraduationCap, Loader2 } from "lucide-react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { suggestionGroups } from "@/lib/suggestions";

interface ComposerProps {
  onSend: (value: { prompt: string; educationLevel: number }) => void;
  isLoading: boolean;
}

export interface ComposerRef {
  focus: () => void;
}

export const Composer = forwardRef<ComposerRef, ComposerProps>(
  ({ onSend, isLoading }, ref) => {
    const [inputValue, setInputValue] = useState("");
    const [activeCategory, setActiveCategory] = useState("");
    const [educationLevel, setEducationLevel] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    function handleSend() {
      if (inputValue.trim()) {
        onSend({
          prompt: inputValue,
          educationLevel,
        });

        setInputValue("");
        setActiveCategory("");
      }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }

    function handlePromptInputValueChange(value: string) {
      setInputValue(value);

      if (value.trim() === "") {
        setActiveCategory("");
      }
    }

    const activeCategoryData = suggestionGroups.find(
      (group) => group.label === activeCategory
    );

    const showCategorySuggestions = activeCategory !== "";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex w-full flex-col space-y-4 max-w-3xl"
      >
        <PromptInput
          className="border-input bg-background border shadow-xs"
          value={inputValue}
          onValueChange={handlePromptInputValueChange}
          onSubmit={handleSend}
        >
          <div className="flex flex-col gap-2">
            <PromptInputTextarea
              ref={textareaRef}
              placeholder="Pide que te explique algo..."
              className="min-h-[44px]"
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  <span>Complejidad de la explicación</span>
                </div>
                <div className="flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEducationLevel(0)}
                    className={cn(
                      "rounded-r-none border-r-0 h-7",
                      educationLevel === 0 && "bg-accent text-accent-foreground"
                    )}
                  >
                    Primaria
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEducationLevel(1)}
                    className={cn(
                      "rounded-none border-x-0 h-7",
                      educationLevel === 1 && "bg-accent text-accent-foreground"
                    )}
                  >
                    Bachillerato
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEducationLevel(2)}
                    className={cn(
                      "rounded-l-none border-l-0 h-7",
                      educationLevel === 2 && "bg-accent text-accent-foreground"
                    )}
                  >
                    Universidad
                  </Button>
                </div>
              </div>
              <PromptInputActions className="justify-end">
                <Button
                  size="sm"
                  className="h-9 w-9 rounded-full"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpIcon className="h-4 w-4" />
                  )}
                </Button>
              </PromptInputActions>
            </div>
          </div>
        </PromptInput>

        <div className="relative flex w-full flex-col items-center justify-center space-y-2">
          <div className="absolute top-0 left-0 h-[70px] w-full">
            {showCategorySuggestions ? (
              <div className="flex w-full flex-col space-y-1">
                {activeCategoryData?.items.map((suggestion) => (
                  <PromptSuggestion
                    key={suggestion.label}
                    highlight={activeCategoryData.highlight}
                    onClick={() => {
                      setInputValue(suggestion.content);
                    }}
                  >
                    {activeCategoryData.highlight} {suggestion.label}
                  </PromptSuggestion>
                ))}
              </div>
            ) : (
              <div className="relative flex w-full flex-wrap items-stretch justify-start gap-2">
                {suggestionGroups.map((suggestion) => (
                  <PromptSuggestion
                    key={suggestion.label}
                    onClick={() => {
                      setActiveCategory(suggestion.label);
                      setInputValue("");
                    }}
                    className="capitalize"
                  >
                    {suggestion.icon}
                    {suggestion.label}
                  </PromptSuggestion>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);
