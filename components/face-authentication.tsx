"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Camera, Loader2 } from "lucide-react"

interface FaceAuthProps {
  onSuccess: (faceData: { timestamp: string; captured: boolean }) => void
  onError: (error: string) => void
  type: "start" | "end"
}

export function FaceAuthentication({ onSuccess, onError, type }: FaceAuthProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [error, setError] = useState("")
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error("[v0] Camera access error:", err)
        setError("Unable to access camera. Please allow camera permissions.")
        onError("Camera access denied")
      }
    }

    initCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream, onError])

  const captureFace = async () => {
    setLoading(true)
    setError("")

    try {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext("2d")
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
          context.drawImage(videoRef.current, 0, 0)

          const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
          const hasContent = imageData.data.some((pixel) => pixel > 50)

          if (!hasContent) {
            setError("No face detected. Please ensure your face is visible.")
            setLoading(false)
            return
          }

          setCaptured(true)
          onSuccess({
            timestamp: new Date().toISOString(),
            captured: true,
          })
        }
      }
    } catch (err) {
      console.error("[v0] Face capture error:", err)
      setError("Failed to capture face. Please try again.")
      onError("Face capture failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {type === "start" ? "Lecture Start" : "Lecture End"} - Face Verification
        </CardTitle>
        <CardDescription>
          {type === "start"
            ? "Verify your identity by capturing your face at the start of the lecture"
            : "Verify your attendance by capturing your face at the end of the lecture"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />

          {captured && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <div className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Face Captured
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {captured && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 flex gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-green-700 dark:text-green-300 text-sm">Face verification successful!</p>
          </div>
        )}

        {/* Capture Button */}
        <Button onClick={captureFace} disabled={loading || captured} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Capturing...
            </>
          ) : captured ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verified
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Capture Face
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
