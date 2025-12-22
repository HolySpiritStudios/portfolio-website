import { lazy } from 'react';

export const ChatScreenLazy = lazy(() => import('./chat.screen').then((module) => ({ default: module.ChatScreen })));
