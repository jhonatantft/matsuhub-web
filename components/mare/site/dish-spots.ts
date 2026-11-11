/**
 * Ingredient hotspots on the dish photos (public/mare/dish-*-1000.jpg, square, seen from above).
 * x / y are percentages of the photo, measured by looking at each image: every label names
 * something that is visibly at that spot. Keep them in sync if a photo is replaced.
 */
/** `side` forces the label side (default: left of the dot when x > 58). */
export type DishSpot = { x: number; y: number; label: string; side?: "left" | "right" };

export const DISH_SPOTS: Record<string, DishSpot[]> = {
  ostras: [
    { x: 48, y: 21, label: "Ostra fresca" },
    { x: 49, y: 47, label: "Mignonette de cebola roxa" },
    { x: 38, y: 38, label: "Limão" },
    { x: 87, y: 54, label: "Gelo picado" },
  ],
  crudo: [
    { x: 23, y: 44, label: "Lâminas de peixe branco" },
    { x: 47, y: 26, label: "Pimenta dedo-de-moça" },
    { x: 49, y: 51, label: "Castanha tostada" },
    { x: 57, y: 60, label: "Coentro" },
    { x: 40, y: 77, label: "Leite de tigre" },
  ],
  polvo: [
    { x: 26, y: 46, label: "Polvo na brasa" },
    { x: 61, y: 57, label: "Batatas ao murro" },
    { x: 72, y: 30, label: "Limão tostado" },
    { x: 78, y: 51, label: "Óleo de páprica defumada" },
    { x: 38, y: 21, label: "Salsinha" },
  ],
  peixe: [
    { x: 29, y: 52, label: "Filé com pele crocante" },
    { x: 31, y: 27, label: "Limão" },
    { x: 46, y: 17, label: "Ervas frescas" },
    { x: 73, y: 41, label: "Farofa de castanha de caju" },
    { x: 52, y: 72, label: "Banana-da-terra grelhada" },
  ],
  camarao: [
    { x: 46, y: 50, label: "Camarão grelhado" },
    { x: 63, y: 45, label: "Arroz de coco", side: "right" },
    { x: 77, y: 62, label: "Molho de moqueca" },
    { x: 43, y: 37, label: "Pimentão" },
    { x: 19, y: 57, label: "Coentro" },
  ],
  cocada: [
    { x: 49, y: 46, label: "Sorvete de tapioca" },
    { x: 47, y: 37, label: "Coco tostado" },
    { x: 28, y: 64, label: "Cocada gratinada" },
    { x: 89, y: 48, label: "Frigideira de ferro" },
  ],
};
