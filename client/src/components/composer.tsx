import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { Button } from "@/components/ui/button";
import {
  ArrowUpIcon,
  Atom,
  BookOpenCheck,
  Brain,
  GraduationCap,
  Loader2,
  Radical,
} from "lucide-react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

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

const suggestionGroups = [
  {
    label: "Matemáticas",
    icon: <Radical />,
    highlight: "Matemáticas >",
    items: [
      {
        label: "¿Qué es la derivada?",
        content: "¿Qué es la derivada?",
      },
      {
        label: "¿Cómo se resuelve la integral?",
        content: "¿Cómo se resuelve la integral?",
      },
      {
        label: "¿Para qué se utiliza la media?",
        content: "¿Para qué se utiliza la media?",
      },
      {
        label: "¿Qué es la desviación estándar?",
        content: "¿Qué es la desviación estándar?",
      },
    ],
  },
  {
    label: "Ciencias Naturales",
    icon: <Atom />,
    highlight: "Ciencias Naturales >",
    items: [
      {
        label: "¿Qué es la entomo-nematología?",
        content: "¿Qué es la entomo-nematología?",
      },
      {
        label: "¿Cómo se diferencia el Aedes aegypti del Aedes albopictus?",
        content: "¿Cómo se diferencia el Aedes aegypti del Aedes albopictus?",
      },
      {
        label: "¿Cómo es el ciclo de krebs en los seres humanos?",
        content: "¿Cómo es el ciclo de krebs en los seres humanos?",
      },
      {
        label: "¿Que condiciones influyen en el cambio climático?",
        content: "¿Que condiciones influyen en el cambio climático?",
      },
    ],
  },
  {
    label: "Ciencias Sociales",
    icon: <Brain />,
    highlight: "Ciencias Sociales >",
    items: [
      {
        label: "¿Qué factores influyen en la migración?",
        content: "¿Qué factores influyen en la migración?",
      },
      {
        label:
          "¿Cuál fue el impacto de la Revolución Industrial en la sociedad?",
        content:
          "¿Cuál fue el impacto de la Revolución Industrial en la sociedad?",
      },
      {
        label: "¿Cómo afecta la globalización a las economías locales?",
        content: "¿Cómo afecta la globalización a las economías locales?",
      },
      {
        label: "¿Qué es el desarrollo sostenible y por qué es importante?",
        content: "¿Qué es el desarrollo sostenible y por qué es importante?",
      },
    ],
  },
  {
    label: "Pruebas Saber",
    icon: <BookOpenCheck />,
    highlight: "Pruebas Saber >",
    items: [
      {
        label: "Lectura Crítica - Análisis de texto",
        content: `En un texto argumentativo sobre el cambio climático, el autor afirma que 'las acciones individuales son insignificantes comparadas con las emisiones industriales'. ¿Cuál es el propósito principal del autor al hacer esta afirmación?

a) Desincentivar las acciones individuales para combatir el cambio climático
b) Enfatizar la necesidad de regulaciones más estrictas para las industrias
c) Comparar la efectividad de diferentes estrategias contra el cambio climático
d) Minimizar la responsabilidad de las industrias en el cambio climático`,
      },
      {
        label: "Competencias Ciudadanas",
        content: `En una comunidad, los vecinos han decidido implementar un sistema de reciclaje. Sin embargo, algunos residentes se oponen argumentando que no tienen tiempo para clasificar los residuos. ¿Qué mecanismo de participación ciudadana sería más efectivo para resolver este conflicto?

a) Realizar una consulta popular vinculante entre todos los residentes
b) Organizar una mesa de diálogo para encontrar soluciones consensuadas
c) Presentar una acción de tutela contra los residentes que se oponen
d) Solicitar al gobierno local que imponga multas a quienes no reciclen`,
      },
      {
        label: "Ciencias Naturales",
        content: `Un estudiante realiza un experimento para medir la tasa de fotosíntesis en diferentes condiciones de luz. Si mantiene constantes la temperatura y la concentración de CO2, ¿qué variable dependiente debería medir para determinar la eficiencia del proceso?

a) La cantidad de oxígeno liberado por unidad de tiempo
b) La intensidad de la luz utilizada en el experimento
c) El número de hojas en la planta experimental
d) La temperatura del ambiente durante el proceso`,
      },
      {
        label: "Matemáticas - Razonamiento",
        content: `En una fábrica, la producción diaria de piezas sigue la función P(t) = -2t² + 24t + 100, donde t es el tiempo en horas y P es el número de piezas producidas. ¿En qué momento del día la producción alcanza su punto máximo?

a) A las 6 horas de iniciada la producción
b) A las 8 horas de iniciada la producción
c) A las 12 horas de iniciada la producción
d) A las 24 horas de iniciada la producción`,
      },
    ],
  },
];
