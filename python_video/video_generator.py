
import torch
from diffusers import DiffusionPipeline
from diffusers.utils import export_to_video
import sys
import json
import os
from pathlib import Path

class VideoGenerator:
    def __init__(self):
        self.pipe = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.init_pipeline()
    
    def init_pipeline(self):
        try:
            print("🐍 Initialisation du pipeline Python diffusers...", file=sys.stderr)
            self.pipe = DiffusionPipeline.from_pretrained(
                "damo-vilab/text-to-video-ms-1.7b", 
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                variant="fp16" if self.device == "cuda" else None
            )
            self.pipe = self.pipe.to(self.device)
            print(f"✅ Pipeline initialisé sur {self.device}", file=sys.stderr)
        except Exception as e:
            print(f"❌ Erreur initialisation pipeline: {e}", file=sys.stderr)
            self.pipe = None
    
    def generate_video(self, prompt, output_path=None):
        if not self.pipe:
            return {"error": "Pipeline non initialisé"}
        
        try:
            print(f"🎬 Génération vidéo: {prompt}", file=sys.stderr)
            
            # Générer les frames
            video_frames = self.pipe(prompt, num_frames=16).frames[0]
            
            # Exporter vers fichier
            if not output_path:
                output_path = f"temp/video_{hash(prompt)}.mp4"
            
            # Créer le dossier si nécessaire
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            video_path = export_to_video(video_frames, output_path)
            
            return {
                "success": True,
                "video_path": str(video_path),
                "method": "python_diffusers"
            }
            
        except Exception as e:
            return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Prompt requis"}))
        sys.exit(1)
    
    prompt = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    generator = VideoGenerator()
    result = generator.generate_video(prompt, output_path)
    
    print(json.dumps(result))
