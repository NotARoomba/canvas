import { CanvasData } from "@/views/canvas";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

interface BoardProps {
  lesson: CanvasData;
}

interface StepPosition {
  x: number;
  y: number;
}

export function Board({ lesson }: BoardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [positions, setPositions] = useState<StepPosition[]>([]);
  const [boundarySize, setBoundarySize] = useState({ width: 2000, height: 2000 });

  useEffect(() => {
    if (lesson.steps) {
      const GRID_SIZE = Math.ceil(Math.sqrt(lesson.steps.length));
      const CELL_SIZE = 500;
      const GRID_OFFSET = (GRID_SIZE - 1) * CELL_SIZE / 2;

      // Calculate boundary size based on grid
      const newBoundarySize = {
        width: (GRID_SIZE * CELL_SIZE) + 400, // Extra padding for title
        height: (GRID_SIZE * CELL_SIZE) + 400,
      };
      setBoundarySize(newBoundarySize);

      const newPositions = lesson.steps.map((_, index) => {
        const row = Math.floor(index / GRID_SIZE);
        const col = index % GRID_SIZE;
        return {
          x: (col * CELL_SIZE) - GRID_OFFSET,
          y: (row * CELL_SIZE) - GRID_OFFSET,
        };
      });
      setPositions(newPositions);
    }
  }, [lesson.steps]);

  if (!lesson.steps || !positions.length) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden">
      <TransformWrapper
        initialScale={0.8}
        initialPositionX={50}
        initialPositionY={50}
        minScale={0.2}
        maxScale={8}
        centerOnInit
        limitToBounds={false}
        panning={{ disabled: false, velocityDisabled: false }}
        pinch={{ disabled: false }}
        doubleClick={{ disabled: true }}
        wheel={{ 
          step: 0.2,
          smoothStep: 0.005,
          wheelDisabled: false 
        }}
        velocityAnimation={{
          sensitivity: 1,
          animationTime: 200,
          equalToMove: true
        }}
        alignmentAnimation={{
          disabled: true
        }}
      >
        {({ setTransform, zoomIn, zoomOut, instance }) => (
          <>
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <div 
                className="relative bg-gradient-to-br from-background to-muted/20"
                style={{ 
                  width: boundarySize.width,
                  height: boundarySize.height,
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
                    backgroundSize: '100px 100px',
                    opacity: 0.1,
                  }}
                />

                {/* Boundary indicator */}
                <div className="absolute inset-4 border border-dashed border-primary/20 rounded-xl" />

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-5xl font-bold mb-6 text-foreground"
                  >
                    <Markdown>{lesson.title || ''}</Markdown>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl text-muted-foreground max-w-2xl"
                  >
                    <Markdown>{lesson.description || ''}</Markdown>
                  </motion.div>
                </div>

                <AnimatePresence>
                  {(lesson.steps || []).map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      className="absolute"
                      style={{
                        left: `calc(50% + ${positions[index].x}px)`,
                        top: `calc(50% + ${positions[index].y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className={cn(
                          "w-[400px] transition-all",
                          currentStep === index
                            ? "scale-110"
                            : "hover:scale-105"
                        )}
                        onClick={() => {
                          setCurrentStep(index);
                          const centerX = window.innerWidth / 2;
                          const centerY = window.innerHeight / 2;
                          const targetX = positions[index].x;
                          const targetY = positions[index].y;
                          
                          setTransform(
                            centerX - targetX,
                            centerY - targetY,
                            1.5,
                            600
                          );
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-medium">
                            {index + 1}
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            <Markdown>{step.title || ''}</Markdown>
                          </div>
                        </div>
                        {step.image && (
                          <img
                            src={`https://canvas.notaroomba.dev/images/${step.image}`}
                            alt={step.title || "Step illustration"}
                            className="w-full aspect-video object-cover rounded-xl mb-4 shadow-xs"
                          />
                        )}
                        <div className="text-muted-foreground leading-relaxed text-lg prose prose-neutral dark:prose-invert">
                          <Markdown>{step.explanation || ''}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Corner indicators */}
                <div className="absolute top-6 left-6 text-xs text-muted-foreground font-mono">
                  ({-boundarySize.width/2}, {-boundarySize.height/2})
                </div>
                <div className="absolute top-6 right-6 text-xs text-muted-foreground font-mono">
                  ({boundarySize.width/2}, {-boundarySize.height/2})
                </div>
                <div className="absolute bottom-6 left-6 text-xs text-muted-foreground font-mono">
                  ({-boundarySize.width/2}, {boundarySize.height/2})
                </div>
                <div className="absolute bottom-6 right-6 text-xs text-muted-foreground font-mono">
                  ({boundarySize.width/2}, {boundarySize.height/2})
                </div>
              </div>
            </TransformComponent>

            <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-between items-center z-50">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const newStep = currentStep - 1;
                    if (newStep >= 0) {
                      setCurrentStep(newStep);
                      const centerX = window.innerWidth / 2;
                      const centerY = window.innerHeight / 2;
                      const targetX = positions[newStep].x;
                      const targetY = positions[newStep].y;

                      setTransform(
                        centerX - targetX,
                        centerY - targetY,
                        1.5,
                        600
                      );
                    }
                  }}
                  disabled={currentStep === 0}
                >
                  Anterior
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    const newStep = currentStep + 1;
                    if (lesson.steps && newStep < lesson.steps.length) {
                      setCurrentStep(newStep);
                      const centerX = window.innerWidth / 2;
                      const centerY = window.innerHeight / 2;
                      const targetX = positions[newStep].x;
                      const targetY = positions[newStep].y;

                      setTransform(
                        centerX - targetX,
                        centerY - targetY,
                        1.5,
                        600
                      );
                    }
                  }}
                  disabled={currentStep === (lesson.steps?.length ?? 0) - 1}
                >
                  Siguiente
                </Button>
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
        )}
      </TransformWrapper>
    </div>
  );
}
