import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useState, useRef, useEffect } from 'react';
import { BounceLoader } from 'react-spinners';

function TranscodeVideo() {
  const [loaded, setLoaded] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [transcodedVideo, setTranscodedVideo] = useState(null);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef(null);
  const messageRef = useRef(null);

  useEffect(() => {
    loadFFmpeg();
    return () => {
      if (videoRef.current?.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
    };
  }, []);

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const videoURL = URL.createObjectURL(videoFile);
      videoRef.current.src = videoURL;
      messageRef.current.innerHTML = 'Video uploaded. Ready to transcode.';
      return () => {
        URL.revokeObjectURL(videoURL);
      };
    }
  }, [videoFile]);

  const loadFFmpeg = async () => {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const ffmpeg = ffmpegRef.current;

      ffmpeg.on('progress', ({ progress, time }) => {
        const percent = (progress * 100).toFixed(2);
        const seconds = Math.round(time / 1000000);
        messageRef.current.innerHTML = `${percent}% (transcoded time: ${seconds} s)`;
      });

      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        // workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });

      setLoaded(true);
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      messageRef.current.innerHTML = 'Failed to load FFmpeg. Please refresh and try again.';
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      setVideoFile(file);
      setTranscodedVideo(null);
    }
  };

  const handleVideoTranscode = async () => {
    if (!videoFile) {
      messageRef.current.innerHTML = 'Please upload a video file first.';
      return;
    }

    const ffmpeg = ffmpegRef.current;
    const inputFileName = videoFile.name;
    const outputFileName = 'output.mp4';
    messageRef.current.innerHTML = 'Transcoding in progress...';


    try {
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));
      await ffmpeg.exec(['-i', inputFileName, outputFileName]);
      const data = await ffmpeg.readFile(outputFileName);
      const transcodedBlob = new Blob([data.buffer], { type: 'video/mp4' });

      if (videoRef.current?.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      const videoURL = URL.createObjectURL(transcodedBlob);
      videoRef.current.src = videoURL;
      setTranscodedVideo(transcodedBlob);

      messageRef.current.innerHTML = 'Transcoding completed. You can download the video.';
    } catch (error) {
      console.error('Error during transcoding:', error);
      messageRef.current.innerHTML = 'An error occurred during transcoding.';
    }
  };

  const downloadVideo = () => {
    if (transcodedVideo) {
      const url = URL.createObjectURL(transcodedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="w-full max-w-3xl p-6">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center h-64">
            <BounceLoader color="#3B82F6" />
            <p className="mt-4 text-gray-600">Loading FFmpeg...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="mb-4 p-2 border border-gray-600 rounded-lg bg-gray-800 text-white file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer file:rounded-lg file:px-4 file:py-2 transition-all duration-300 hover:border-gray-500"
            />

            {(videoFile || transcodedVideo) && (
              <video
                ref={videoRef}
                controls
                autoPlay
                muted
                className="w-full max-h-96 mb-4 rounded-lg shadow-lg"
              ></video>
            )}

            <div className="flex space-x-4 mb-4">
              {!transcodedVideo ? (
                <button
                  onClick={handleVideoTranscode}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-all duration-300"
                >
                  Transcode
                </button>
              ) : (
                <button
                  onClick={downloadVideo}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition-all duration-300"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        )}
        <p ref={messageRef} className="text-center text-gray-300"></p>
      </div>
    </div>
  );
}

export default TranscodeVideo;
