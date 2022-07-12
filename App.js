import React, { useEffect, useRef, useState } from "react"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { Camera, CameraCaptureError, useCameraDevices, VideoFile } from "react-native-vision-camera"
import { useIsForeground } from "./src/hook/useIsForeground"
import Video from "react-native-video"
import { VESDK } from "react-native-videoeditorsdk"
import ReactNativeBlobUtil from "react-native-blob-util"
import { launchImageLibrary } from "react-native-image-picker"

export default function() {
  const devices = useCameraDevices()
  const device = devices.back
  const isAppForeground = useIsForeground()
  const camera = useRef(null)
  const serialization = useRef(null)

  const [path, setPath] = useState(null)
  const [isReady, setReady] = useState(false)
  const [isRecoding, setRecoding] = useState(false)
  const [rawPath, setRawPath] = useState(null)

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

  const onRecordingFinished = async ({path}: {path: string}, sObj = null) => {
    setRawPath(path)

    const obj = await VESDK.openEditor(path, {
      export: {
        serialization: {
          enabled: true
        }
      }
    }, sObj)
    setPath(obj.video)
    serialization.current = obj.serialization
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

  const backToEditor = async () => {
    if(rawPath) {
      const sobj = typeof serialization.current === "string" ? JSON.parse(await ReactNativeBlobUtil.fs.readFile(serialization.current)) : null
      onRecordingFinished({path: rawPath}, sobj)
    }
  }

  const pickVideo = () => {
    launchImageLibrary({
      mediaType: "video"
    }, (res) => {
      if(res.assets && res.assets.length) {
        onRecordingFinished({path: res.assets[0].uri})
      }
    })
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
        <TouchableOpacity onPress={()=>setPath(null)} style={{height: 50, width: 50, borderRadius: 50, backgroundColor: "red", top: 50, right: "10%", position: "absolute", zIndex: 100 }} />
        <TouchableOpacity onPress={backToEditor} style={{height: 50, width: 50, borderRadius: 50, backgroundColor: "blue", top: 50, right: "25%", position: "absolute", zIndex: 100 }} />
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
        enableZoomGesture={true}
      />
      <TouchableOpacity onPress={onRecoding} style={{height: 50, width: 50, borderRadius: 50, backgroundColor: isRecoding ? "green" : "red", bottom: 50, left: "45%", position: "absolute", zIndex: 100 }} />
      <TouchableOpacity onPress={pickVideo} style={{height: 50, width: 50, borderRadius: 50, backgroundColor: "yellow", bottom: 50, left: "15%", position: "absolute", zIndex: 100 }} />
    </View>
  )
}
