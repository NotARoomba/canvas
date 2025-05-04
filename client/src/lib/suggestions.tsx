import { Atom, BookOpenCheck, Brain, Radical } from "lucide-react";

export const suggestionGroups = [
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
