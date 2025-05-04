import { CanvasData } from "@/views/canvas";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Minus, Grid2X2, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

interface BoardProps {
  lesson: CanvasData;
}

export function Board({ lesson }: BoardProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);
  const transformFunctionsRef = useRef<{
    resetTransform?: () => void;
    setTransform?: (x: number, y: number, scale: number, duration?: number) => void;
  }>({});

  if (!lesson.steps?.length) {
    return <div>Cargando...</div>;
  }

  const steps = lesson.steps;
  const gridSize = Math.ceil(Math.sqrt(steps.length));

  const playAudio = async (index: number) => {
    if (index >= 0 && index < steps.length && steps[index].tts) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(`https://canvas.notaroomba.dev/tts/${steps[index].tts}`);
      audioRef.current = audio;
      
      audio.addEventListener('ended', () => {
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
  };

  const toggleAudio = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (currentStep >= 0) {
      playAudio(currentStep);
    }
  };

  const handleStepTransition = (index: number) => {
    setCurrentStep(index);

    if (index === -1) {
      // Overview: zoom out to see all content
      transformFunctionsRef.current.resetTransform?.();
      // Stop audio when going to overview
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Individual step: zoom to specific position
      const col = index % gridSize;
      const row = Math.floor(index / gridSize);
      const centerX = (col + 0.5) * 800;
      const centerY = (row + 0.5) * 800;

      transformFunctionsRef.current.setTransform?.(
        window.innerWidth / 2 - centerX,
        window.innerHeight / 2 - centerY,
        1.2,
        600
      );
    }
  };

  // Auto-start playback when steps are loaded
  useEffect(() => {
    if (steps.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      handleStepTransition(0);
      playAudio(0);
    }
  }, [steps.length]);

  const startPlayback = () => {
    const startIndex = currentStep === -1 ? 0 : currentStep;
    handleStepTransition(startIndex);
    playAudio(startIndex);
  };

  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <TransformWrapper
        initialScale={0.4}
        minScale={0.2}
        maxScale={2}
        centerOnInit
        limitToBounds={true}
        panning={{ disabled: false, velocityDisabled: false }}
        pinch={{ disabled: false }}
        doubleClick={{ disabled: true }}
        wheel={{
          step: 0.1,
          smoothStep: 0.002,
          wheelDisabled: false,
        }}
        velocityAnimation={{
          sensitivity: 0.8,
          animationTime: 300,
          equalToMove: true,
        }}
        alignmentAnimation={{
          disabled: true,
        }}
        centerZoomedOut={true}
      >
        {({ zoomIn, zoomOut, resetTransform, setTransform }) => {
          // Store transform functions in ref for use outside this scope
          transformFunctionsRef.current = { resetTransform, setTransform };

          return (
            <>
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full"
              >
                <div
                  className="relative bg-gradient-to-br from-background to-muted/20"
                  style={{
                    width: `${gridSize * 800}px`,
                    height: `${gridSize * 800}px`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gap: "60px",
                    padding: "300px 120px 120px",
                  }}
                >
                  {/* Grid background */}
                  <div
                    className="absolute inset-0 grid"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, var(--border) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--border) 1px, transparent 1px)
                      `,
                      backgroundSize: "100px 100px",
                      opacity: 0.1,
                    }}
                  />

                  {/* Title and Description - spans full grid width */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 text-center"
                    style={{
                      width: `${gridSize * 600}px`,
                      top: "60px",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-6xl font-bold mb-12 text-foreground"
                    >
                      <Markdown>{lesson.title || ""}</Markdown>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-2xl text-muted-foreground max-w-3xl mx-auto mb-24"
                    >
                      <Markdown>{lesson.description || ""}</Markdown>
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                        }}
                        className={cn(
                          "w-full h-full p-6 transition-all duration-300",
                          currentStep === index
                            ? "scale-105 z-10"
                            : currentStep === -1
                            ? "scale-100 hover:scale-102"
                            : "scale-95 opacity-50"
                        )}
                        onClick={() =>
                          handleStepTransition(currentStep === -1 ? index : -1)
                        }
                      >
                        <div
                          className={cn(
                            "bg-background/50 backdrop-blur-sm rounded-xl p-8 h-full transition-all duration-300",
                            currentStep === -1
                              ? "hover:shadow-lg hover:bg-background/70"
                              : ""
                          )}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center text-lg font-medium">
                              {index + 1}
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                              <Markdown>{step.title || ""}</Markdown>
                            </div>
                          </div>
                          {step.image && (
                            <img
                              src={`https://canvas.notaroomba.dev/images/${step.image}`}
                              alt={step.title || "Step illustration"}
                              className="w-full aspect-video object-cover rounded-xl mb-6 shadow-xs"
                            />
                          )}
                          <div
                            className={cn(
                              "text-muted-foreground leading-relaxed text-lg prose prose-neutral dark:prose-invert",
                              currentStep === -1 ? "line-clamp-2" : ""
                            )}
                          >
                            <Markdown>{step.explanation || ""}</Markdown>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </TransformComponent>

              <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-between items-center z-50">
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      const newStep = currentStep - 1;
                      handleStepTransition(newStep);
                      if (newStep >= 0) {
                        playAudio(newStep);
                      }
                    }}
                    disabled={currentStep === -1}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      const newStep = currentStep + 1;
                      if (newStep < steps.length) {
                        handleStepTransition(newStep);
                        playAudio(newStep);
                      }
                    }}
                    disabled={currentStep === steps.length - 1}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleStepTransition(-1)}
                    className="gap-2"
                  >
                    <Grid2X2 className="h-4 w-4" />
                    Vista general
                  </Button>
                  <Button
                    variant={isPlaying ? "default" : "outline"}
                    size="lg"
                    onClick={startPlayback}
                    className="gap-2"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isPlaying ? "Pausar" : "Reproducir todo"}
                  </Button>
                  {currentStep >= 0 && steps[currentStep].tts && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={toggleAudio}
                      className="gap-2"
                    >
                      {isPlaying ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      {isPlaying ? "Pausar audio" : "Reproducir audio"}
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => zoomOut()}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => zoomIn()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}
