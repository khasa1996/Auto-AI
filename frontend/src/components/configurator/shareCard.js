function text(value, fallback = "Not selected") {
  return String(value || fallback).slice(0, 80);
}

export function buildShareCardData({ vehicleName, variantName, color, wheels, interior, roof, price, city }) {
  return {
    vehicleName: text(vehicleName, "Configured vehicle"),
    variantName: text(variantName, "Custom configuration"),
    color: text(color),
    wheels: text(wheels),
    interior: text(interior),
    roof: text(roof),
    price: price ? text(price) : "Price on request",
    city: city ? text(city) : "",
  };
}

export function normalizeShareCardRequest(sourceOrRequest, legacyRequest) {
  if (legacyRequest && typeof legacyRequest === "object") {
    return {
      sourceCanvas: sourceOrRequest,
      vehicleName: legacyRequest.vehicleName,
      variantName: legacyRequest.variantName || legacyRequest.variant,
      color: legacyRequest.color,
      wheels: legacyRequest.wheels,
      interior: legacyRequest.interior,
      roof: legacyRequest.roof,
      price: legacyRequest.price,
      city: legacyRequest.city,
    };
  }
  return sourceOrRequest || {};
}

function wrapLines(ctx, value, maxWidth, maxLines = 2) {
  const words = text(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export async function buildConfiguratorShareCard(sourceOrRequest, legacyRequest) {
  const request = normalizeShareCardRequest(sourceOrRequest, legacyRequest);
  const {
    sourceCanvas,
    vehicleName,
    variantName,
    color,
    wheels,
    interior,
    roof,
    price,
    city,
  } = request;

  if (!sourceCanvas) throw new Error("Configurator canvas is unavailable");
  const data = buildShareCardData({ vehicleName, variantName, color, wheels, interior, roof, price, city });
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Share card canvas is unavailable");

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.globalAlpha = 0.96;
  const imageRatio = sourceCanvas.width / sourceCanvas.height || 1;
  const targetWidth = 1160;
  const targetHeight = 500;
  const targetRatio = targetWidth / targetHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceCanvas.width;
  let sh = sourceCanvas.height;
  if (imageRatio > targetRatio) {
    sw = sourceCanvas.height * targetRatio;
    sx = (sourceCanvas.width - sw) / 2;
  } else {
    sh = sourceCanvas.width / targetRatio;
    sy = (sourceCanvas.height - sh) / 2;
  }
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 20, 20, targetWidth, targetHeight);
  ctx.restore();

  const gradient = ctx.createLinearGradient(0, 520, 0, 760);
  gradient.addColorStop(0, "rgba(5,5,5,0.96)");
  gradient.addColorStop(1, "#050505");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 500, canvas.width, 260);

  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("AUTO AI INDIA", 40, 548);
  ctx.font = "500 32px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.vehicleName, 40, 590);
  ctx.font = "400 16px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(data.variantName, 40, 616);

  const specs = [
    ["Colour", data.color],
    ["Wheels", data.wheels],
    ["Interior", data.interior],
    ["Roof", data.roof],
  ];
  let x = 40;
  for (const [label, value] of specs) {
    ctx.font = "700 11px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.fillText(label.toUpperCase(), x, 654);
    ctx.font = "400 14px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    wrapLines(ctx, value, 190, 1).forEach((line, index) => ctx.fillText(line, x, 676 + index * 17));
    x += 210;
  }

  ctx.textAlign = "right";
  ctx.font = "700 26px Arial, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(data.price, 1160, 590);
  ctx.font = "400 12px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(data.city ? `Estimated on-road · ${data.city}` : "Estimated on-road", 1160, 616);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Unable to create share card"))), "image/png", 1);
  });
}
