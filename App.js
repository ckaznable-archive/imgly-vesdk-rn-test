import React, { useEffect, useRef, useState } from "react"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { Camera, CameraCaptureError, useCameraDevices, VideoFile } from "react-native-vision-camera"
import { useIsForeground } from "./src/hook/useIsForeground"
import Video from "react-native-video"
import { VESDK } from "react-native-videoeditorsdk"

export default function() {
  const devices = useCameraDevices()
  const device = devices.back
  const isAppForeground = useIsForeground()
  const camera = useRef(null)

  const [path, setPath] = useState(null)
  const [isReady, setReady] = useState(false)
  const [isRecoding, setRecoding] = useState(false)

  const isActive = isAppForeground && isReady

  useEffect(() => {
    Promise.all([Camera.getCameraPermissionStatus(), Camera.getMicrophonePermissionStatus()]).then(async ([cameraPermission, microphonePermission]) => {
      let grantedCamera = cameraPermission === "authorized"
      let grantedMic = microphonePermission === "authorized"

      if(cameraPermission !== "authorized") {
        grantedCamera = (await Camera.requestCameraPermission()) === "authorized"
      }

      if(microphonePermission !== "authorized") {
        grantedMic = (await Camera.requestMicrophonePermission()) === "authorized"
      }

      setReady(grantedCamera && grantedMic)
    })
  }, [])

  const onRecordingFinished = async (video: VideoFile) => {
    const obj = await VESDK.openEditor(video.path)
    setPath(obj.video)
  }

  const onRecordingError = (err: CameraCaptureError) => {
    console.error(err)
  }

  const onRecoding = () => {
    isRecoding ? stopRecoding() : startRecoding()
  }

  const stopRecoding = () => {
    setRecoding(false)
    camera.current?.stopRecording()
  }

  const startRecoding = () => {
    setRecoding(true)
    camera.current?.startRecording({onRecordingFinished, onRecordingError})
  }

  if (!device) return <></>

  if(path) {
    return (
      <View style={{flex: 1, position: "relative"}}>
        <Video
          source={{uri: path}}
          resizeMode="stretch"
          posterResizeMode="stretch"
          style={{flex: 1}}
          automaticallyWaitsToMinimizeStalling={false}
          fullscreenAutorotate={false}
          paused={false}
          allowsExternalPlayback={false}
          controls={true}
          repeat={true}
        />
        <TouchableOpacity onPress={()=>setPath(null)} style={{height: 50, width: 50, borderRadius: 50, backgroundColor: isRecoding ? "green" : "red", top: 50, right: "10%", position: "absolute", zIndex: 100 }} />
      </View>
    )
  }

  return (
    <View style={{flex: 1, position: "relative"}}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        fps={30}
        hdr={true}
        video={true}
        audio={true}
      />
      <TouchableOpacity onPress={onRecoding} style={{height: 50, width: 50, borderRadius: 50, backgroundColor: isRecoding ? "green" : "red", bottom: 50, left: "45%", position: "absolute", zIndex: 100 }} />
    </View>
  )
}
