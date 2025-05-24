import { CanvasData } from "@/views/canvas";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

interface BoardProps {
  lesson: CanvasData;
}

export function Board({ lesson }: BoardProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const steps = lesson.steps || [];

  const playAudio = useCallback(
    async (index: number) => {
      if (index >= 0 && index < steps.length && steps[index].tts) {
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(
          `https://canvas.notaroomba.dev/tts/${steps[index].tts}`
        );
        audioRef.current = audio;

        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          // Move to next step when audio ends
          if (index < steps.length - 1) {
            const nextStep = index + 1;
            handleStepTransition(nextStep);
            playAudio(nextStep);
          }
        });

        setIsPlaying(true);
        await audio.play();
      }
    },
    [steps]
  );

  const handleStepTransition = useCallback((index: number) => {
    setCurrentStep(index);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (currentStep >= 0) {
      playAudio(currentStep);
    }
  }, [isPlaying, currentStep, playAudio]);

  const startPlayback = useCallback(() => {
    const startIndex = currentStep === -1 ? 0 : currentStep;
    handleStepTransition(startIndex);
    playAudio(startIndex);
  }, [currentStep, handleStepTransition, playAudio]);

  if (!steps.length) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="w-full h-full bg-background relative overflow-hidden">
      {/* Title Slide */}
      <AnimatePresence mode="wait">
        {currentStep === -1 ? (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-background to-muted/20"
          >
            <h1 className="text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
              <Markdown>{lesson.title || ""}</Markdown>
            </h1>
            <p className="text-3xl text-muted-foreground max-w-4xl">
              <Markdown>{lesson.description || ""}</Markdown>
            </p>
            <Button
              size="lg"
              className="mt-12"
              onClick={() => {
                handleStepTransition(0);
              }}
            >
              Comenzar
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-full max-w-7xl h-full p-12">
              <div className="relative w-full h-full bg-card rounded-xl shadow-lg overflow-hidden">
                {/* Step content */}
                <div className="absolute inset-0 p-8 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center text-xl font-medium">
                      {currentStep + 1}
                    </div>
                    <h2 className="text-4xl font-bold text-foreground">
                      <Markdown>{steps[currentStep]?.title || ""}</Markdown>
                    </h2>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-8">
                    {steps[currentStep]?.image && (
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={`http://localhost:3001/images/${steps[currentStep].image}`}
                          alt={steps[currentStep].title || "Step illustration"}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
                      <Markdown>
                        {steps[currentStep]?.explanation || ""}
                      </Markdown>
                    </div>

                    {/* References */}
                    {steps[currentStep]?.references &&
                      steps[currentStep].references.length > 0 && (
                        <div className="mt-auto pt-8 border-t">
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            Referencias
                          </h3>
                          <div className="flex flex-col gap-1.5">
                            {steps[currentStep].references.map((ref, index) => (
                              <div
                                key={index}
                                className="text-sm text-muted-foreground font-mono"
                              >
                                {ref}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const newStep = currentStep - 1;
            if (newStep >= -1) {
              handleStepTransition(newStep);
              if (newStep >= 0) playAudio(newStep);
            }
          }}
          disabled={currentStep <= -1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {currentStep >= 0 && (
          <div className="bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </div>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const newStep = currentStep + 1;
            if (newStep < steps.length) {
              handleStepTransition(newStep);
              playAudio(newStep);
            }
          }}
          disabled={currentStep >= steps.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {currentStep >= 0 && (
          <>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="icon"
              onClick={startPlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {steps[currentStep].tts && (
              <Button variant="outline" size="icon" onClick={toggleAudio}>
                {isPlaying ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
