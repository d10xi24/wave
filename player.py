import asyncio
import base64
import json
import os
import threading
import time
import random


import eyed3
import logging
from mutagen.id3 import ID3
from flask import Flask

app = Flask(__name__)

logging.basicConfig(level=logging.ERROR)
app.logger.addHandler(logging.StreamHandler())


class MusicPlayer:
    def __init__(self):
        self.music_dir = os.path.join(os.path.dirname(__file__), "static/music")
        self.music_files = [file for file in os.listdir(self.music_dir) if file.endswith(".mp3")]
        self.current_song = {"title": "", "artist": "", "duration": 0, "filename": ""}

    @staticmethod
    def load_playlist():
        return {"songs": [], "songIndex": 0}
    
    @staticmethod
    def save_metadata(filename, metadata):
        metadata_dir = os.path.join(os.path.dirname(__file__), "metadata")
        os.makedirs(metadata_dir, exist_ok=True)

        metadata_file_path = os.path.join(metadata_dir, f"{filename}.json")
        with open(metadata_file_path, "w") as file:
            json.dump(metadata, file)
    
    async def metadata(self, filename):
        filepath = os.path.join(self.music_dir, filename)

        metadata_cache_dir = os.path.join(os.path.dirname(__file__), "static/metadata")
        os.makedirs(metadata_cache_dir, exist_ok=True)

        try:
            cached_metadata_file = os.path.join(metadata_cache_dir, f"{filename}.json")
            if os.path.exists(cached_metadata_file):
                with open(cached_metadata_file, "r") as file:
                    cached_metadata = file.read()
                print(f"Loaded cached metadata for {filename}: {cached_metadata}")

                try:
                    cached_metadata = json.loads(cached_metadata)
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON: {str(e)}")

                return cached_metadata
            
            audiofile = await asyncio.to_thread(eyed3.load, filepath)

            tag = audiofile.tag.frame_set
            album_art = None

            for frame_id, frame in tag.items():
                frame_id = frame_id.decode('utf-8', 'ignore')        
                if frame_id.startswith("APIC"):
                    if frame and frame[0].data and isinstance(frame[0].data, bytes):
                        album_art = base64.b64encode(frame[0].data).decode('utf-8', 'ignore')
                        break

            tags = ID3(filepath)

            title = audiofile.tag.title if audiofile.tag.title else "Unknown Title"
            artist = audiofile.tag.artist if audiofile.tag.artist else "Unknown Artist"
            duration = int(audiofile.info.time_secs)


               
            metadata = {
                "title": title,
                "artist": artist,
                "duration": duration,
                "filename": filename,
                "album_art": album_art
            }

            print(f"Saving metadata to cache for {filename}: {metadata}")

            with open(cached_metadata_file, "w") as file:
                json.dump(metadata, file)

            return metadata

        except FileNotFoundError:
            app.logger.error(f"File not found: {filepath}")
            raise

        except Exception as e:
            app.logger.error(f"Error in metadata: {str(e)}")
            raise

    async def play(self):
        def Playsave():
            while True:
                random_song = random.choice(self.music_files)

                try:
                    metadata = asyncio.run(self.metadata(random_song))
                    self.current_song = metadata
                    self.lastsong()

                    time.sleep(metadata["duration"])

                   
                    playlist_data = self.load_playlist()
                    playlist_data["playedSongs"].append({
                        "title": metadata["title"],
                        "artist": metadata["artist"],
                        "filename": metadata["filename"],
                        "timestamp": time.time() 
                    })
                    self.save_playlist(playlist_data)

                except Exception as e:
                    app.logger.error(f"Error in play: {str(e)}")

        threading.Thread(target=Playsave).start()

        return self.current_song