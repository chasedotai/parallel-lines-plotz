class ParallelLinesEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.numLines = 10;
        this.spacing = 20;
        this.controlPoints = [];
        this.isDragging = false;
        this.selectedPoint = null;
        this.dragStartY = 0;
        this.numControlPoints = 5;

        this.setupCanvas();
        this.initializeControlPoints();
        this.addEventListeners();
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth - 40; // Account for padding
        this.canvas.height = Math.min(window.innerHeight * 0.6, 600);
    }

    handleResize() {
        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        
        this.setupCanvas();
        
        // Scale all points to new dimensions
        const scaleX = this.canvas.width / oldWidth;
        const scaleY = this.canvas.height / oldHeight;
        
        this.controlPoints.forEach(line => {
            line.forEach(point => {
                point.x *= scaleX;
                point.y *= scaleY;
            });
        });
        
        this.draw();
    }

    initializeControlPoints() {
        this.controlPoints = [];
        const step = this.canvas.width / (this.numControlPoints - 1);
        
        for (let i = 0; i < this.numLines; i++) {
            const points = [];
            for (let j = 0; j < this.numControlPoints; j++) {
                points.push({
                    x: j * step,
                    y: this.canvas.height / 2
                });
            }
            this.controlPoints.push(points);
        }
    }

    addEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        document.getElementById('numLines').addEventListener('change', (e) => {
            this.numLines = parseInt(e.target.value);
            this.initializeControlPoints();
            this.draw();
        });

        document.getElementById('spacing').addEventListener('change', (e) => {
            this.spacing = parseInt(e.target.value);
            this.draw();
        });

        document.getElementById('controlPoints').addEventListener('change', (e) => {
            this.numControlPoints = parseInt(e.target.value);
            this.initializeControlPoints();
            this.draw();
        });

        document.getElementById('downloadSvg').addEventListener('click', this.downloadSVG.bind(this));

        // Add touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (let i = 0; i < this.controlPoints.length; i++) {
            for (let j = 0; j < this.controlPoints[i].length; j++) {
                const point = this.controlPoints[i][j];
                if (Math.hypot(x - point.x, y - point.y) < 10) {
                    this.isDragging = true;
                    this.selectedPoint = { lineIndex: i, pointIndex: j };
                    this.dragStartY = y;
                    return;
                }
            }
        }
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.selectedPoint) return;

        const rect = this.canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const deltaY = y - this.dragStartY;

        // Update selected point and adjust neighboring lines
        const { lineIndex, pointIndex } = this.selectedPoint;
        const originalY = this.controlPoints[lineIndex][pointIndex].y;
        this.controlPoints[lineIndex][pointIndex].y = y;

        // Adjust points above and below to maintain parallel-like structure
        for (let i = lineIndex - 1; i >= 0; i--) {
            const factor = (lineIndex - i) / (lineIndex + 1);
            this.controlPoints[i][pointIndex].y = y - (this.spacing * (lineIndex - i));
        }
        for (let i = lineIndex + 1; i < this.controlPoints.length; i++) {
            const factor = (i - lineIndex) / (this.controlPoints.length - lineIndex);
            this.controlPoints[i][pointIndex].y = y + (this.spacing * (i - lineIndex));
        }

        this.dragStartY = y;
        this.draw();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.selectedPoint = null;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw lines
        for (const points of this.controlPoints) {
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length - 2; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            
            this.ctx.quadraticCurveTo(
                points[points.length - 2].x,
                points[points.length - 2].y,
                points[points.length - 1].x,
                points[points.length - 1].y
            );
            
            this.ctx.strokeStyle = '#000';
            this.ctx.stroke();
        }

        // Draw control points
        for (const points of this.controlPoints) {
            for (const point of points) {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#666';
                this.ctx.fill();
            }
        }
    }

    downloadSVG() {
        let svg = `<svg width="${this.canvas.width}" height="${this.canvas.height}" xmlns="http://www.w3.org/2000/svg">`;
        
        for (const points of this.controlPoints) {
            let path = `M ${points[0].x} ${points[0].y}`;
            
            for (let i = 1; i < points.length - 2; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
            }
            
            path += ` Q ${points[points.length - 2].x} ${points[points.length - 2].y} ${points[points.length - 1].x} ${points[points.length - 1].y}`;
            
            svg += `<path d="${path}" stroke="black" fill="none"/>`;
        }
        
        svg += '</svg>';

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'parallel-lines.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Scale coordinates based on canvas size
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.handleMouseDown({
            clientX: x * scaleX,
            clientY: y * scaleY
        });
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDragging) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Scale coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.handleMouseMove({
            clientX: x * scaleX,
            clientY: y * scaleY
        });
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp();
    }
}

// Initialize the editor when the page loads
window.addEventListener('load', () => {
    const editor = new ParallelLinesEditor();
    editor.draw();
}); 