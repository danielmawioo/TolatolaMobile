import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

export interface NavigationMapFrameHandle {
  post: (message: unknown) => void;
}

interface Props {
  html: string;
  onMessage: (raw: string) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native side of the navigation map. A WebView (rather than a native Mapbox
 * module) keeps the existing Expo build untouched while still giving us
 * Mapbox GL JS roads, pitch and route geometry.
 */
export const NavigationMapFrame = forwardRef<NavigationMapFrameHandle, Props>(
  function NavigationMapFrame({ html, onMessage, style }, ref) {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(
      ref,
      () => ({
        post: (message: unknown) => {
          webViewRef.current?.postMessage(JSON.stringify(message));
        },
      }),
      [],
    );

    return (
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={style}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onShouldStartLoadWithRequest={(request) =>
          request.url === 'about:blank' || request.url.startsWith('https://')
        }
      />
    );
  },
);
