const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const merge = require('easy-pdf-merge');
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

// Parse request bodies
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.use(express.static(path.join(__dirname, "public")));

const mergePDFs = async (pdfFilePaths, outputFilePath) => {
  return new Promise((resolve, reject) => {
    merge(pdfFilePaths, outputFilePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(outputFilePath);
      }
    });
  });
};

app.post("/convert", async (req, res) => {
  try {
    const svgCodes = req.body.svgCodes; // array data

    function extractSvgSize(svgCode) {
      const widthMatch = svgCode.match(/width="([^"]*)"/);
      const heightMatch = svgCode.match(/height="([^"]*)"/);
    
      const width = widthMatch ? widthMatch[1] : null;
      const height = heightMatch ? heightMatch[1] : null;
    
      return { width, height };
    }

    const pdfFiles = [];

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (let i = 0; i < svgCodes.length; i++) {
      const svgCode = svgCodes[i];
      if (svgCode.trim() !== "") {
        let paraMeter = svgCode.toString();
        let size = extractSvgSize(paraMeter);

        const pdfFilePath = `output_${i}.pdf`;

        await page.setContent(`<div>${svgCode}</div>`, { waitUntil: "networkidle0" });

        await page.pdf({
          path: pdfFilePath,
          width: `${size.width}px`,
          height: `${size.height}px`,
          printBackground: true,
        });

        pdfFiles.push(pdfFilePath);

        // Clear the page content after generating the PDF for this SVG
        await page.setContent('');
      }
    }

    await browser.close();

    let mergedPDFPath;

    // Check if the number of pages is greater than 2
    if (pdfFiles.length >= 2) {
      mergedPDFPath = "output.pdf";

      await mergePDFs(pdfFiles, mergedPDFPath);

      // Cleanup individual PDF files
      pdfFiles.forEach((pdfFilePath) => {
        fs.unlink(pdfFilePath, (err) => {
          if (err) {
            console.error(err);
          }
        });
      });
    } else {
      // If there are less than or equal to 2 pages, use the first PDF directly
      mergedPDFPath = pdfFiles[0];
    }

    res.setHeader("Content-Disposition", `attachment; filename=${mergedPDFPath}`);
    res.setHeader("Content-Type", "application/pdf");

    res.download(mergedPDFPath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("An error occurred while downloading the PDF file.");
      }

      // Delete the generated merged PDF file after sending (if it exists)
      if (pdfFiles.length >= 2) {
        fs.unlink(mergedPDFPath, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while converting the SVGs to PDF.");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
