// 1. Animations
export const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

export const buttonHover = { scale: 1.05 };
export const buttonTap = { scale: 0.98 };

export const umlNodeAnimation = {
  animate: { y: ["0%", "-5%", "0%"], rotate: [0, 3, -3, 0] },
  transition: {
    duration: 4 + Math.random() * 2,
    repeat: Infinity,
    repeatType: "mirror",
  },
};

// 2. Data (Nodes & Connections)
export const nodes = [
  { id: "actor1", type: "actor", top: "10%", left: "15%", label: "User" },
  { id: "actor2", type: "actor", top: "65%", left: "20%", label: "Admin" },
  { id: "usecase1", type: "usecase", top: "25%", left: "70%", label: "Login" },
  {
    id: "usecase2",
    type: "usecase",
    top: "50%",
    left: "70%",
    label: "Generate UML",
  },
  {
    id: "usecase3",
    type: "usecase",
    top: "40%",
    left: "30%",
    label: "Save Diagram",
  },
];

export const connections = [
  { from: "actor1", to: "usecase1" },
  { from: "actor1", to: "usecase2" },
  { from: "actor2", to: "usecase2" },
  { from: "actor2", to: "usecase3" },
];
