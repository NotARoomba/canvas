import { CanvasData } from "@/views/canvas";
import { Stage, Layer, Group, Text, Image, Rect } from "react-konva";
import Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

interface AreaProps {
  lesson: CanvasData;
}

const SPACING = 300;
const CARD_WIDTH = 280;
const CARD_HEIGHT = 200;
const ZOOM_LEVEL = 1.5;
const ANIMATION_DURATION = 0.5;
const PADDING = 100; // Padding around the overview

export function Area({ lesson }: AreaProps) {
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [currentStep, setCurrentStep] = useState(0); // Start with 0 (overview)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        setDimensions({
          width: containerRef.current?.offsetWidth || 0,
          height: containerRef.current?.offsetHeight || 0,
        });
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);

      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, []);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.remove();
      }
    };
  }, []);

  const playAudio = (ttsId: string) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.remove();
    }

    const audio = new Audio(`https://canvas.notaroomba.dev/tts/${ttsId}`);
    setCurrentAudio(audio);
    
    audio.addEventListener('ended', () => {
      if (isPlaying && currentStep < (lesson.steps?.length || 0)) {
        goToNextStep();
      } else {
        setIsPlaying(false);
      }
    });

    audio.play();
  };

  const togglePlayback = () => {
    if (!lesson.steps?.length) return;

    if (isPlaying) {
      setIsPlaying(false);
      if (currentAudio) {
        currentAudio.pause();
      }
    } else {
      setIsPlaying(true);
      if (currentStep === 0) {
        goToNextStep();
      } else if (lesson.steps[currentStep - 1].tts) {
        playAudio(lesson.steps[currentStep - 1].tts);
      }
    }
  };

  const calculateOverviewPosition = () => {
    if (!lesson.steps?.length) return { x: 0, y: 0, scale: 1 };

    const rows = Math.ceil(lesson.steps.length / 3);
    const cols = Math.min(lesson.steps.length, 3);

    // Calculate total width and height of all cards including spacing
    const totalWidth = cols * CARD_WIDTH + (cols - 1) * SPACING;
    const totalHeight = rows * CARD_HEIGHT + (rows - 1) * SPACING;

    // Calculate scale to fit all content with padding
    const scaleX = (dimensions.width - PADDING * 2) / totalWidth;
    const scaleY = (dimensions.height - PADDING * 2) / totalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in, only out if needed

    // Center position
    const x = (dimensions.width - totalWidth * scale) / 2;
    const y = (dimensions.height - totalHeight * scale) / 2;

    return { x, y, scale };
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;
    
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: pointer.x / oldScale - stage.x() / oldScale,
      y: pointer.y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setStageScale(newScale);
    setStagePosition({
      x: -(mousePointTo.x - pointer.x / newScale) * newScale,
      y: -(mousePointTo.y - pointer.y / newScale) * newScale,
    });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    setStagePosition({
      x: stage.x(),
      y: stage.y(),
    });
  };

  const animateToPosition = (newX: number, newY: number, newScale: number) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const initialProps = {
      x: stage.x(),
      y: stage.y(),
      scaleX: stage.scaleX(),
      scaleY: stage.scaleY(),
    };

    const animation = new Konva.Animation((frame) => {
      if (!frame || !frame.time) return;

      const time = Math.min(frame.time / (ANIMATION_DURATION * 1000), 1);
      // Ease out cubic function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - time, 3);

      const currentX = initialProps.x + (newX - initialProps.x) * easeOut;
      const currentY = initialProps.y + (newY - initialProps.y) * easeOut;
      const currentScale = initialProps.scaleX + (newScale - initialProps.scaleX) * easeOut;

      stage.x(currentX);
      stage.y(currentY);
      stage.scaleX(currentScale);
      stage.scaleY(currentScale);

      setStagePosition({ x: currentX, y: currentY });
      setStageScale(currentScale);

      if (time >= 1) {
        animation.stop();
      }
    }, stage.getLayer());

    animation.start();
  };

  const goToStep = (stepIndex: number) => {
    if (!lesson.steps) return;
    
    if (stepIndex === 0) {
      // Overview
      const { x, y, scale } = calculateOverviewPosition();
      setCurrentStep(0);
      animateToPosition(x, y, scale);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.remove();
        setCurrentAudio(null);
      }
    } else {
      // Individual step
      const actualIndex = stepIndex - 1;
      if (actualIndex < 0 || actualIndex >= lesson.steps.length) return;

      const row = Math.floor(actualIndex / 3);
      const col = actualIndex % 3;
      const x = col * (CARD_WIDTH + SPACING);
      const y = row * (CARD_HEIGHT + SPACING);

      // Calculate center position
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // Calculate the position to center the card
      const newX = centerX - (x * ZOOM_LEVEL + CARD_WIDTH * ZOOM_LEVEL / 2);
      const newY = centerY - (y * ZOOM_LEVEL + CARD_HEIGHT * ZOOM_LEVEL / 2);

      setCurrentStep(stepIndex);
      animateToPosition(newX, newY, ZOOM_LEVEL);

      // Play audio if in autoplay mode
      if (isPlaying && lesson.steps[actualIndex].tts) {
        playAudio(lesson.steps[actualIndex].tts);
      }
    }
  };

  const goToNextStep = () => {
    if (!lesson.steps) return;
    const nextStep = (currentStep + 1) % (lesson.steps.length + 1);
    goToStep(nextStep);
  };

  const goToPreviousStep = () => {
    if (!lesson.steps) return;
    const prevStep = currentStep - 1 < 0 ? lesson.steps.length : currentStep - 1;
    goToStep(prevStep);
  };

  // Set initial position to overview (step 0)
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0 && lesson.steps?.length) {
      goToStep(0);
    }
  }, [dimensions, lesson.steps]);

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0">
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousStep}
          disabled={!lesson.steps?.length}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayback}
          disabled={!lesson.steps?.length}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextStep}
          disabled={!lesson.steps?.length}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <>
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            onWheel={handleWheel}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable
            onDragEnd={handleDragEnd}
          >
            <Layer>
              {lesson.steps?.map((step, index) => {
                const row = Math.floor(index / 3);
                const col = index % 3;
                const x = col * (CARD_WIDTH + SPACING);
                const y = row * (CARD_HEIGHT + SPACING);

                return (
                  <Group key={index} x={x} y={y}>
                    <Rect
                      width={CARD_WIDTH}
                      height={CARD_HEIGHT}
                      fill="white"
                      shadowColor="rgba(0,0,0,0.1)"
                      shadowBlur={10}
                      shadowOffsetY={2}
                      cornerRadius={8}
                      stroke={currentStep === index + 1 ? "#0ea5e9" : "transparent"}
                      strokeWidth={2}
                    />
                    {step.image && (
                      <Image
                        x={10}
                        y={10}
                        width={260}
                        height={100}
                        image={new window.Image()}
                        onLoad={(e: { currentTarget: HTMLImageElement }) => {
                          const img = e.currentTarget;
                          img.src = `https://canvas.notaroomba.dev/images/${step.image}`;
                        }}
                      />
                    )}
                    <Text
                      x={10}
                      y={step.image ? 120 : 10}
                      width={260}
                      text={step.title}
                      fontSize={16}
                      fontFamily="system-ui"
                      fill="#1a1a1a"
                      fontStyle="bold"
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
          {/* Render Markdown content outside of Konva */}
          {currentStep > 0 && lesson.steps && (
            <div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-md"
              style={{
                zIndex: 20,
                pointerEvents: "none", // Allow clicking through to the canvas
              }}
            >
              <Markdown className="prose prose-sm">
                {lesson.steps[currentStep - 1].explanation}
              </Markdown>
            </div>
          )}
        </>
      )}
    </div>
  );
}
