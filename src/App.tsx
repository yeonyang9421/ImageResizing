import React, { useState } from "react";
import {
  Button,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { saveAs } from "file-saver";

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [resizedImage, setResizedImage] = useState<string | null>(null);
  const [resizeMode, setResizeMode] = useState<"png" | "svg">("png");
  const [unit, setUnit] = useState<"pixels" | "inches">("pixels");
  const [width, setWidth] = useState<number>(300);
  const [height, setHeight] = useState<number>(300);
  const [dpi, setDpi] = useState<number>(72);
  const [imageId, setImageId] = useState<string>("");
  const [originImageUrl, setOriginImageUrl] = useState<string | null>(null);

  // const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       if (e.target?.result) {
  //         setImage(e.target.result as string);
  //         setResizedImage(null); // Clear the resized image when a new file is selected
  //       }
  //     };
  //     reader.readAsDataURL(e.target.files[0]);
  //   }
  // };

  

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImage(e.target.result as string);
          setResizedImage(null); // Clear the resized image when a new file is selected
          // Create an image element to get the dimensions
          const img = new Image();
          img.src = e.target.result as string;
          img.onload = () => {
            setWidth(img.naturalWidth);
            setHeight(img.naturalHeight);
          };
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleFetchFromImageId = async () => {
    try {
      const apiUrl = `https://polapolarplanet.azurewebsites.net/api/v1/printingTicket/${imageId}/image`;
      const response = await fetch(apiUrl, {
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch API data with status ${response.status}`
        );
      }

      const data = await response.json();
      let fetchedOriginImageUrl = data.originImageUrl;

      if (!fetchedOriginImageUrl) {
        throw new Error("No originImageUrl found in the API response");
      }

      // Append .png if not already present
      // if (!fetchedOriginImageUrl.endsWith('.png')) {
      //   fetchedOriginImageUrl += '.png';
      // }

      setOriginImageUrl(fetchedOriginImageUrl);

      // const imageResponse = await fetch(fetchedOriginImageUrl);
      // if (!imageResponse.ok) {
      //   throw new Error(`Failed to fetch the image with status ${imageResponse.status}`);
      // }

      // const blob = await imageResponse.blob();
      // const objectURL = URL.createObjectURL(blob);
      // setImage(objectURL);
    } catch (error) {
      console.error("Failed to fetch the image from API:", error);
      alert(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching the image"
      );
    }
  };

  const handleDownloadOriginal = () => {
    if (!originImageUrl) {
      alert("No originImageUrl available to open");
      return;
    }
    try {
      // Open the URL in a new tab
      window.open(originImageUrl, "_blank");
    } catch (error) {
      console.error("Failed to open the image URL:", error);
      alert("An error occurred while opening the image URL.");
    }
  };

  const convertToPixels = (value: number, dpi: number) => {
    return unit === "inches" ? Math.round(value * dpi) : value;
  };

  const handleResize = () => {
    if (!image) return;

    const convertedWidth = convertToPixels(width, dpi);
    const convertedHeight = convertToPixels(height, dpi);

    if (resizeMode === "png") {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = convertedWidth;
        canvas.height = convertedHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, convertedWidth, convertedHeight);
          setResizedImage(canvas.toDataURL("image/png"));
        }
      };
    } else if (resizeMode === "svg") {
      // Ensure the image is properly embedded in the SVG as a base64 data URL
      const img = new Image();
      img.src = image;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageDataUrl = canvas.toDataURL("image/png");

          const svgContent = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${convertedWidth}" height="${convertedHeight}" viewBox="0 0 ${convertedWidth} ${convertedHeight}">
              <image href="${imageDataUrl}" width="100%" height="100%" />
            </svg>
          `;
          const svgBlob = new Blob([svgContent], {
            type: "image/svg+xml;charset=utf-8",
          });
          const svgUrl = URL.createObjectURL(svgBlob);
          setResizedImage(svgUrl); // Store the blob URL to be used for downloading
        }
      };
    }
  };
  const handleDownloadResized = () => {
    if (!resizedImage) {
      alert("No resized image available to download");
      return;
    }
  
    // Get current date and time
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
  
    // Calculate dimensions in inches if unit is inches, else keep as pixels
    const widthInInches = unit === "inches" ? width : (width / dpi).toFixed(2);
    const heightInInches = unit === "inches" ? height : (height / dpi).toFixed(2);
  
    // Generate filename
    const filename = `${date}_${time}_${widthInInches}x${heightInInches}_DPI${dpi}`;
  
    if (resizeMode === "svg") {
      const link = document.createElement("a");
      link.href = resizedImage;
      link.download = `${filename}.svg`; // Save as .svg
      link.click();
      URL.revokeObjectURL(resizedImage); // Clean up object URL
    } else {
      saveAs(resizedImage, `${filename}.png`); // Save as .png
    }
  };

  const handleImageIdChange = (value: string) => {
    // Remove non-numeric characters and limit to 6 digits
    const sanitizedValue = value.replace(/\D/g, "").slice(0, 6);
    setImageId(sanitizedValue);
  };

  const formatImageId = (value: string) => {
    const paddedValue = value.padEnd(6, "_"); // Fill with underscores up to 6 digits
    return paddedValue.split("").map((char, idx) => (
      <span
        key={idx}
        style={{
          fontSize: "24px",
          display: "inline-block",
          width: "20px",
          textAlign: "center",
          marginRight: idx < 5 ? "10px" : "0", // Add spacing except for the last digit
          borderBottom: "2px solid #000",
        }}
      >
        {char !== "_" ? char : "\u00A0"}
      </span>
    ));
  };


  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🐻‍❄️ 폴럽 코드로 이미지 리사이징 테스트 🐻‍❄️</h1>
      <div>
        <h3> 1) 폴라 코드 입력</h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <TextField
            value={imageId}
            onChange={(e) => handleImageIdChange(e.target.value)}
            inputProps={{ maxLength: 6 }}
            placeholder="Enter Code"
            style={{ width: "200px", marginRight: "20px" }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            {formatImageId(imageId)}
          </div>
        </div>
        <Button
          variant="contained"
          onClick={handleFetchFromImageId}
          style={{ marginBottom: "20px" }}
        >
          폴라 코드로 출력용 이미지주소 찾기
        </Button>
      </div>
      {/* {image && ( */}
      <div>
        <h3>2) 찾은 이미지 로컬에 저장 </h3>
        {/* <img src={image} alt="original" style={{ maxWidth: '300px', maxHeight: '300px' }} /> */}
        {originImageUrl && (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleDownloadOriginal}
            style={{ marginTop: "10px" }}
          >
            출력용 이미지 로컬에 저장
          </Button>
        )}
      </div>
      {/* )} */}
      <div>
        <h3>3) 로컬에 있는 이미지 불러오기</h3>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </div>

      <div>
        <h3>Resize Options</h3>
        <FormControl>
          <InputLabel>Unit</InputLabel>
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "pixels" | "inches")}
            style={{ marginBottom: "10px", width: "150px" }}
          >
            <MenuItem value="pixels">Pixels</MenuItem>
            <MenuItem value="inches">Inches</MenuItem>
          </Select>
        </FormControl>
        <RadioGroup
          row
          value={resizeMode}
          onChange={(e) => setResizeMode(e.target.value as "png" | "svg")}
        >
          <FormControlLabel value="png" control={<Radio />} label="png" />
          <FormControlLabel value="svg" control={<Radio />} label="svg" />
        </RadioGroup>
        <TextField
          label={`Width (${unit})`}
          type="number"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          style={{ marginRight: "10px" }}
        />
        <TextField
          label={`Height (${unit})`}
          type="number"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
          style={{ marginRight: "10px" }}
        />
        <TextField
          label="DPI"
          type="number"
          value={dpi}
          onChange={(e) => setDpi(Number(e.target.value))}
          disabled={unit === "pixels"}
        />
        <div style={{ marginTop: "10px" }}>
          <Button variant="contained" color="primary" onClick={handleResize}>
            Resize
          </Button>
        </div>
      </div>
      {resizedImage && (
        <div style={{ marginTop: "20px" }}>
          <h3>Resized Image</h3>
          <img
            src={resizedImage}
            alt="resized"
            style={{ maxWidth: "300px", maxHeight: "300px" }}
          />
          <div style={{ marginTop: "10px" }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleDownloadResized}
            >
              Download Resized
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
