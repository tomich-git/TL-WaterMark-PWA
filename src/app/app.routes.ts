import { Routes } from '@angular/router';
import { ImageProcessorComponent } from './image-processor/image-processor.component';

export const routes: Routes = [
    { path: "**", component: ImageProcessorComponent }
];
