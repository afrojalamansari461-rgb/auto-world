import React, { useEffect, useState } from "react";
import { animate } from "motion/react";

interface CountUpProps {
  to: number | string;
  duration?: number;
  formatter?: (value: number) => string;
}

export const CountUp: React.FC<CountUpProps> = ({ to, duration = 1.0, formatter }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isNumeric, setIsNumeric] = useState(true);
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    let targetNum = 0;
    let textSuffix = "";

    if (typeof to === "number") {
      targetNum = to;
    } else {
      // Parse numeric part from string (e.g. "11,200 km" or "15,000")
      const cleaned = to.replace(/,/g, "");
      const matchNum = cleaned.match(/^([\d\.]+)/);
      if (matchNum) {
        targetNum = parseFloat(matchNum[1]);
        textSuffix = cleaned.substring(matchNum[1].length);
      } else {
        setIsNumeric(false);
        return;
      }
    }

    setSuffix(textSuffix);
    setIsNumeric(true);

    const controls = animate(0, targetNum, {
      duration,
      ease: [0.16, 1, 0.3, 1], // premium custom easeOutExpo curve
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [to, duration]);

  if (!isNumeric) {
    return <>{to}</>;
  }

  const rounded = Math.round(displayValue);

  if (formatter) {
    return <>{formatter(rounded)}</>;
  }

  if (typeof to === "string") {
    return <>{rounded.toLocaleString("en-IN")}{suffix}</>;
  }

  return <>{rounded.toLocaleString("en-IN")}</>;
};
