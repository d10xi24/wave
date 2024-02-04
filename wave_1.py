import json
import asyncio
import base64
import logging

from flask import Flask, make_response, render_template, jsonify, request, send_from_directory
from player import MusicPlayer

app = Flask(__name__)

logging.basicConfig(level=logging.ERROR)
app.logger.addHandler(logging.StreamHandler())
   
player = MusicPlayer()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/play")
def play():
    try:
        current_song = asyncio.run(player.play())

        if isinstance(current_song["album_art"], bytes):
            current_song["album_art"] = base64.b64encode(current_song["album_art"]).decode('utf-8')

        return jsonify(current_song)
    except Exception as e:
        print(f"Error in /play route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/static/music/<path:filename>")
def get_music(filename):
    try:
        return send_from_directory(player.music_dir, filename)
    except Exception as e:
        app.logger.error(f"Error in /static/music/<filename> route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/songs")
def songs():
    try:
        songs = player.music_files
        song_list = []

        for filename in songs:
            try:
                metadata = asyncio.run(player.metadata(filename))
                song_list.append({
                    "title": metadata["title"],
                    "artist": metadata["artist"],
                    "filename": metadata["filename"],
                    "album_art": metadata["album_art"]
                })
            except Exception as e:
                app.logger.error(f"Error in /songs route while loading metadata: {str(e)}")

        return jsonify({"songs": song_list})

    except Exception as e:
        app.logger.error(f"Error in /songs route: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/metadata")
def metadata():
    try:
        filename = request.args.get("filename")
        app.logger.info(f"Fetching metadata for file: {filename}")

        if filename.lower().endswith('.mp3'):
            metadata = asyncio.run(player.metadata(filename))
        elif filename.lower().endswith('.aac'):

            metadata = asyncio.run(player.metadata(filename))
        else:
            raise ValueError(f"Unsupported file format: {filename}")
        
        app.logger.info(f"Metadata received: {metadata}")
        return jsonify(metadata)

    except Exception as e:
        app.logger.error(f"Error in /metadata route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/load_playlist', methods=['GET'])
def load_playlist():
    try:
        data = {"songs": [], "songIndex": 0}
        return jsonify(data)
       
    except json.decoder.JSONDecodeError:
        app.logger.error(f"Error decoding JSON: {str(e)}")
        return jsonify({"error": f"Error decoding JSON: {str(e)}"}), 500
  
   
if __name__ == "__main__":
    try:
        app.run(debug=False)
    except Exception as e:
    
        print(f"Error while running the Flask app: {str(e)}")