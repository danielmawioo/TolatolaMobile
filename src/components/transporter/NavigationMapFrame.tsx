import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface NavigationMapFrameHandle {
  post: (message: unknown) => void;
}

interface Props {
  html: string;
  onMessage: (raw: string) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Web side of the navigation map. The same Mapbox/Leaflet HTML runs in an
 * iframe and bridges messages through `window.postMessage`, so the web build
 * gets the in-app map too instead of a "open Google Maps" link.
 */
export const NavigationMapFrame = forwardRef<NavigationMapFrameHandle, Props>(
  function NavigationMapFrame({ html, onMessage, style }, ref) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        post: (message: unknown) => {
          frameRef.current?.contentWindow?.postMessage(JSON.stringify(message), '*');
        },
      }),
      [],
    );

    useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (event.source !== frameRef.current?.contentWindow) return;
        const data = event.data;
        if (!data || data.source !== 'tola-navigation') return;
        onMessage(JSON.stringify({ type: data.type, payload: data.payload }));
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onMessage]);

    return React.createElement('iframe', {
      ref: frameRef,
      srcDoc: html,
      title: 'TOLA navigation map',
      style: {
        border: 'none',
        width: '100%',
        height: '100%',
        display: 'block',
        ...(style as object),
      },
    });
  },
);
