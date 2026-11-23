// https://github.com/NotionX/react-notion-x/blob/master/packages/react-notion-x/src/third-party/pdf.tsx
import { isUnsignedUrl } from "@/lib/sign";
import React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// dummy
// export default function Pdf({ file, ...rest }: { file: string }) {
//   return <></>
// }

// ensure pdfjs can find its worker script regardless of how react-notion-x is bundled
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

export default function Pdf({ file, ...rest }: { file: string }) {
  const [numPages, setNumPages] = React.useState<number>(0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // It's a workaround. Unsigned files will be signed when page loads in client.
  const unsigned = isUnsignedUrl(file);

  if (unsigned) {
    return null;
  }

  return (
    <Document file={file} onLoadSuccess={onDocumentLoadSuccess} {...rest}>
      {Array.from(Array.from({ length: numPages }), (_, index) => (
        <Page key={`page_${index + 1}`} pageNumber={index + 1} />
      ))}
    </Document>
  );
}
