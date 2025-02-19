import { Component, ElementRef, isDevMode, ViewChild } from '@angular/core';
import { FootComponent } from "../foot/foot.component";
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-image-processor',
  standalone: true,
  imports: [FootComponent, CommonModule],
  templateUrl: './image-processor.component.html',
  styleUrl: './image-processor.component.css'
})
export class ImageProcessorComponent {

  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  ctx!: CanvasRenderingContext2D | null;
  img = new Image();
  selectedFile: File | null = null;
  singleLine = false;
  currentText = "";

  private inputSubject = new Subject<string>();

  constructor() {
    this.inputSubject.pipe(
      debounceTime(500)
    ).subscribe(value => {
      this.processChangedText(value);
    })
  }

  async ngAfterViewInit() {

    this.ctx = this.canvas.nativeElement.getContext('2d');

    const customFont = new FontFace("WatermarkFont", "url('/fonts/watermark.ttf') format('truetype')");
    await customFont.load();
    
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if(input.files && input.files.length > 0) {
      
      this.selectedFile = input.files[0];

      if(!this.selectedFile.type.startsWith('image/')) {
        this.selectedFile = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.img.src = e.target.result;
        this.img.onload = () => this.drawImage()
      };
      reader.readAsDataURL(this.selectedFile)
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    fileInput.click();
  }

  drawImage() {

    if(this.ctx) {

      const canvas = this.canvas.nativeElement;
      
      canvas.width = this.img.width;
      canvas.height = this.img.height;

      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(this.img, 0, 0);

      this.applyGrayscale();

    }
  }

  applyGrayscale() {

    if(this.ctx) {

      const canvas = this.canvas.nativeElement;
      const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for(let i=0; i<data.length; i+=4) {
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = data[i+1] = data[i+2] = avg;
      }

      this.ctx.putImageData(imageData, 0, 0);

    }

  }

  downloadImage() {

    const canvas = this.canvas.nativeElement;

    if(!canvas) {
      return;
    }

    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = 'watermark_image.png';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }

  applyWaterMark(text:string) {

    if(!this.img || !this.ctx) return;

    const canvas = this.canvas.nativeElement;
    canvas.width = this.img.width;
    canvas.height = this.img.height;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.drawImage(this.img, 0, 0);
    this.applyGrayscale();
    
    const watermarkImage = this.createWaterMarkImage(text);

    watermarkImage.onload = () => {
      const fuzzyWatermarkImage = this.createFuzzyImage(watermarkImage);

      fuzzyWatermarkImage.onload = () => {
        this.ctx!!.globalAlpha = 0.5;
        this.ctx!!.drawImage(fuzzyWatermarkImage, 0, 0, canvas.width - 0, canvas.height - 0);
        this.ctx!!.globalAlpha = 1.0;
      }
    }

  }

  createFuzzyImage(image: HTMLImageElement): HTMLImageElement {

    const canvasIn = document.createElement('canvas');
    canvasIn.width = image.width;
    canvasIn.height = image.height;
    const ctxIn = canvasIn.getContext('2d');
    if(!ctxIn) throw new Error("No se pudo obtener el contexto del canvas");
    ctxIn.drawImage(image, 0, 0);

    const canvasOut = document.createElement('canvas');
    canvasOut.width = image.width;
    canvasOut.height = image.height;
    const ctxOut = canvasOut.getContext('2d');
    if(!ctxOut) throw new Error("No se pudo obtener el contexto del canvas");

    const imageDataIn = ctxIn.getImageData(0, 0, canvasIn.width, canvasIn.height);
    const dataIn = imageDataIn.data;

    const imageDataOut = ctxOut.createImageData(canvasOut.width, canvasOut.height);
    const dataOut = imageDataOut.data;

    for(let i=0; i<dataIn.length; i+=4) {
      if(dataIn[i] == 255 && dataIn[i+1] == 255 && dataIn[i+2] == 255) {
        dataOut[i] = dataOut[i+1] = dataOut[i+2] = 255;
        dataOut[i+3] = dataIn[i+3];
      } else {
        const rndValue = Math.floor(Math.random() * 129);
        dataOut[i] = dataOut[i+1] = dataOut[i+2] = rndValue;
        dataOut[i+3] = dataIn[i+3];
      }
    }

    ctxOut.putImageData(imageDataOut, 0, 0);

    const img = new Image();
    img.src = canvasOut.toDataURL('image/png');

    return img;

  }

  createWaterMarkImage(text:string): HTMLImageElement {

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if(!ctx) return new Image();

    canvas.width = this.img.width;
    canvas.height = this.img.height;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'black';
    
    var rotatedWidth = Math.abs(canvas.width * Math.cos(-Math.PI / 6)) + Math.abs(canvas.height * Math.sin(-Math.PI / 6));
    
    if(this.singleLine) {

      let padding = canvas.width / 32;
      rotatedWidth = rotatedWidth - 2*padding;

      const maxFontSize = this.calcMaxFontSize(ctx, text, rotatedWidth);
      ctx.font = maxFontSize+'px WatermarkFont';
      ctx.textAlign = 'center';
    
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);

      ctx.fillText(text, 0, 0);

    } else {

      let padding = canvas.width / 32;
      rotatedWidth = rotatedWidth - 2*padding;

      const fontSize = canvas.height/10;
      ctx.font = fontSize+'px WatermarkFont';
      const lines = this.wrapTextLines(ctx, text, rotatedWidth);
      ctx.textAlign = 'center';

      ctx.translate(canvas.width / 2, (canvas.height / 2) - (lines.length-1)*fontSize/2);
      ctx.rotate(-Math.PI / 6);

      lines.forEach((line, index) => {
        ctx.fillText(line, 0, index*fontSize);
      });
          
    }

    const img = new Image(canvas.width, canvas.height);
    img.src = canvas.toDataURL('image/png');

    return img;

  }

  wrapTextLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
     
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];

    words.forEach(word => {
      const currentLine = line + word + " ";
      const metrics = ctx.measureText(currentLine);

      if(metrics.width > width && line != "") {
        lines.push(line);
        line = word + " ";
      } else {
        line = currentLine;
      }
    })

    if(line != "")
      lines.push(line);

    return lines;

  }

  calcMaxFontSize(ctx: CanvasRenderingContext2D, text: string, width: number): number {

    var currentSize = 600;
    var fit = false;

    do {
      ctx.font = currentSize+'px WatermarkFont';
      var textMetrics = ctx.measureText(text);

      if(textMetrics.width < width)
        return currentSize;
      else
        currentSize -= 1;

    } while(!fit && currentSize > 8);
    
    return currentSize;

  }

  onChangedText(event: Event) {
    const element: HTMLInputElement = event.target as HTMLInputElement;
    this.currentText = element.value;
    this.inputSubject.next(element.value);    
  }

  processChangedText(text: string) {
    this.applyWaterMark(text);
  }

  onChangeMultiLine(event: Event) {
    const element: HTMLInputElement = event.target as HTMLInputElement;
    this.singleLine = !element.checked;

    this.inputSubject.next(this.currentText);
  }

}
