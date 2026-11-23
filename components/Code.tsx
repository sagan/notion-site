// https://github.com/NotionX/react-notion-x/blob/v7.7.1/packages/react-notion-x/src/third-party/code.tsx
// merge: https://github.com/NotionX/react-notion-x/pull/504/files

// eslint-disable-next-line import/no-duplicates
import "prismjs";
import "prismjs/components/prism-markup-templating.js";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-docker.js";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-js-templates.js";
import "prismjs/components/prism-coffeescript.js";
import "prismjs/components/prism-diff.js";
import "prismjs/components/prism-git.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-graphql.js";
import "prismjs/components/prism-handlebars.js";
import "prismjs/components/prism-less.js";
import "prismjs/components/prism-makefile.js";
import "prismjs/components/prism-markdown.js";
import "prismjs/components/prism-objectivec.js";
import "prismjs/components/prism-ocaml.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-reason.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-sass.js";
import "prismjs/components/prism-scss.js";
import "prismjs/components/prism-solidity.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-stylus.js";
import "prismjs/components/prism-swift.js";
import "prismjs/components/prism-wasm.js";
import "prismjs/components/prism-yaml.js";

import copyToClipboard from "clipboard-copy";
import mermaid from "mermaid";
import { type CodeBlock } from "notion-types";
import { getBlockTitle } from "notion-utils";
// eslint-disable-next-line import/no-duplicates, no-duplicate-imports
import prism from "prismjs";
import React, { useState, useRef, useEffect } from "react";
import { Text, useNotionContext } from "react-notion-x";
// import CopyIcon from '../icons/copy'
// import { cs } from '../utils'

const cs = (...classes: Array<string | undefined | false>) => classes.filter((a) => !!a).join(" ");

// --- Lightbox Component with Zoom/Pan ---
export function Lightbox({ svgContent, onClose }: { svgContent: string | null; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // A ref to the container to get its dimensions for accurate zooming
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // When the lightbox is open, hide overflow on the body
    if (svgContent) {
      document.body.classList.add("mermaid-popup-open");
    } else {
      document.body.classList.remove("mermaid-popup-open");
    }
  }, [svgContent]);

  if (!svgContent) {
    return null;
  }

  // Closes the lightbox if the backdrop is clicked, but not the content
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // --- Event Handlers for Zoom and Pan ---

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    const clampedScale = Math.min(Math.max(newScale, 0.5), 10); // Min 50%, Max 1000% zoom

    // Get mouse position relative to the container element
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate the new position to zoom towards the mouse pointer
    const imageX = (mouseX - position.x) / scale;
    const imageY = (mouseY - position.y) / scale;
    const newPositionX = mouseX - imageX * clampedScale;
    const newPositionY = mouseY - imageY * clampedScale;

    setScale(clampedScale);
    setPosition({ x: newPositionX, y: newPositionY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    // Store the starting point of the pan
    setStartPan({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    // Update position based on mouse movement
    setPosition({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // --- UI Control Handlers ---

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zooms towards the center of the view
  const handleZoom = (direction: "in" | "out") => {
    if (!containerRef.current) return;

    const zoomFactor = 1.4;
    const newScale = direction === "in" ? scale * zoomFactor : scale / zoomFactor;
    const clampedScale = Math.min(Math.max(newScale, 0.5), 10);

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const imageX = (centerX - position.x) / scale;
    const imageY = (centerY - position.y) / scale;
    const newPositionX = centerX - imageX * clampedScale;
    const newPositionY = centerY - imageY * clampedScale;

    setScale(clampedScale);
    setPosition({ x: newPositionX, y: newPositionY });
  };

  // Common styles for the control buttons
  const buttonStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "40px",
    height: "30px",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "bold",
  };

  return (
    <div // Backdrop
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        cursor: "pointer",
        overflow: "hidden", // Prevent page scroll when image is zoomed
      }}
      onClick={handleBackdropClick}
    >
      {/* This outer div is the "viewport" for the SVG content */}
      <div
        ref={containerRef}
        style={{
          background: "white",
          borderRadius: "8px",
          maxWidth: "90%",
          maxHeight: "90%",
          minWidth: "60%",
          minHeight: "60%",
          overflow: "hidden", // This is crucial to clip the transformed content
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {/* This inner div is what actually gets zoomed and panned */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
            padding: "1rem", // Padding is now inside the transformed element
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {/* Close Button (Unchanged) */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "white",
          border: "none",
          borderRadius: "50%",
          width: "30px",
          height: "30px",
          cursor: "pointer",
          fontSize: "20px",
          lineHeight: "30px",
          textAlign: "center",
        }}
      >
        &times;
      </button>

      {/* New Zoom Controls */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255, 255, 255, 0.8)",
          borderRadius: "8px",
          padding: "5px",
          display: "flex",
          gap: "5px",
          zIndex: 1001,
        }}
      >
        <button onClick={() => handleZoom("in")} style={buttonStyle}>
          +
        </button>
        <button onClick={() => handleZoom("out")} style={buttonStyle}>
          -
        </button>
        <button onClick={handleReset} style={{ ...buttonStyle, width: "auto", padding: "0 10px" }}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default function Code({
  block,
  defaultLanguage = "typescript",
  className,
}: {
  block: CodeBlock;
  defaultLanguage?: string;
  className?: string;
}) {
  const [lightboxSvg, setLightboxSvg] = React.useState<string | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const copyTimeout = React.useRef<number | undefined>(undefined);
  const { recordMap } = useNotionContext();
  const content = getBlockTitle(block, recordMap);
  const language = (() => {
    const languageNotion = (block.properties?.language?.[0]?.[0] || defaultLanguage).toLowerCase();

    switch (languageNotion) {
      case "c++":
        return "cpp";
      case "f#":
        return "fsharp";
      default:
        return languageNotion;
    }
  })();
  const caption = block.properties.caption;

  const mermaidRef = React.useRef<HTMLDivElement | null>(null);
  const codeRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (codeRef.current) {
      try {
        prism.highlightElement(codeRef.current);
      } catch (err) {
        console.warn("prismjs highlight error", err);
      }
    }
  }, [codeRef.current]);

  React.useEffect(() => {
    const renderMermaid = async () => {
      if (language === "mermaid" && mermaidRef.current) {
        try {
          mermaid.initialize({
            startOnLoad: true,
            theme: "dark",
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true,
              curve: "linear",
            },
          });
          const { svg } = await mermaid.render(`mermaid-${block.id}`, content);
          console.log("svg", svg);
          // await mermaid.run({ querySelector: '.mermaid' });
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = svg;
            // Make the rendered SVG clickable for the lightbox
            const svgElement = mermaidRef.current.querySelector("svg");
            if (svgElement) {
              let svgPopup = svg;
              // DOM disallows two <svg>  of the same id? only the latter will display.
              svgPopup = svgPopup.replace(/<svg id="[^"]*"/, `<svg id="mermaid-lightbox-${block.id}"`);
              svgElement.onclick = () => setLightboxSvg(svgPopup);
            }
          }
        } catch (err) {
          console.warn("mermaid highlight error", err);
        }
      }
    };

    renderMermaid().catch(() => console.log);
  }, [language, mermaidRef.current]);

  const onClickCopyToClipboard = React.useCallback(() => {
    void copyToClipboard(content);
    setIsCopied(true);

    if (copyTimeout.current) {
      clearTimeout(copyTimeout.current);
      copyTimeout.current = undefined;
    }

    copyTimeout.current = setTimeout(() => {
      setIsCopied(false);
    }, 1200) as unknown as number;
  }, [content, copyTimeout]);

  const copyButton = (
    <div className="notion-code-copy-button" onClick={onClickCopyToClipboard}>
      <CopyIcon />
    </div>
  );

  console.log("code render", language);
  return (
    <>
      <pre
        className={cs("notion-code", `language-${language}`, className)}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        <div className="notion-code-copy">
          {copyButton}

          {isCopied && (
            <div className="notion-code-copy-tooltip">
              <div>{isCopied ? "Copied" : "Copy"}</div>
            </div>
          )}
        </div>

        <code className={`language-${language}`} ref={codeRef as any}>
          {content}
        </code>
      </pre>

      {caption && (
        <figcaption className="notion-asset-caption">
          <Text value={caption} block={block} />
        </figcaption>
      )}
      {language === "mermaid" && (
        <>
          <div ref={mermaidRef} suppressHydrationWarning={true} className="mermaid">
            {content}
          </div>
          <Lightbox svgContent={lightboxSvg} onClose={() => setLightboxSvg(null)} />
        </>
      )}
    </>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" width="1em" version="1.1" {...props}>
      <path
        fillRule="evenodd"
        d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"
      />
      <path
        fillRule="evenodd"
        d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"
      />
    </svg>
  );
}
