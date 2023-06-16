import ColorizeCanvas from "./ColorizeCanvas";
import Dataset from "./Dataset";

export default class RecordingControls {
    private startBtn: HTMLButtonElement;
    private abortBtn: HTMLButtonElement;
    private isRecording: boolean;
    private dataset: Dataset | null;
    private canvas: ColorizeCanvas;

    constructor(canvas: ColorizeCanvas) {
        this.startBtn = document.querySelector("#sequence_start_btn")!;
        this.abortBtn = document.querySelector("#sequence_abort_btn")!;
        this.isRecording = false;
        this.dataset = null;
        this.canvas = canvas;

        this.startBtn.addEventListener("click", () => this.handleStartButtonClick());
    }

    public setCanvas(canvas: ColorizeCanvas) {
        this.canvas = canvas;
        console.log(this.canvas.domElement);
    }

    private async handleStartButtonClick(): Promise<void> {
        console.log("AAAA");
        this.canvas.render();
        // Get canvas as an image URL that can be downloaded
        const dataURL = this.canvas.domElement.toDataURL("image/png");
        console.log(dataURL);
        let imageURL = dataURL.replace(/^data:image\/png/,'data:application/octet-stream');
        console.log(imageURL);
        
        // Create a link element to download the image
        const a = document.createElement("a");
        document.body.appendChild(a);
        
        // Not supported on all browsers.
        // if (window.hasOwnProperty('showSaveFilePicker')) {
        //        const handle = await window.showSaveFilePicker();
        // }

        for (let i = 0; i < 2; i++) {
            //a.style = "display: none";
            a.href = imageURL;
            a.download = `image${i}.png`;
            a.click();
        }
        a.remove()
    }
}