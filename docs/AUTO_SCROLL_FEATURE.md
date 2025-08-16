# Auto-Scroll Feature Documentation

## Overview

The auto-scroll feature in ScriptFlow automatically scrolls the transcript to follow the video playback, keeping the currently spoken text visible and centered in the transcript viewer.

## Features

### 1. **Automatic Scrolling**

- Automatically scrolls to the active transcript segment during video playback
- Smooth scrolling animation with center alignment
- Real-time synchronization with video progress

### 2. **Smart Pause Detection**

- Automatically pauses auto-scroll when user manually scrolls
- Shows countdown timer (10 seconds) before re-enabling
- Prevents interruption of user reading experience

### 3. **Manual Toggle Control**

- **Enable/Disable Button**: Manual toggle to control auto-scroll
- **Visual Status Indicator**: Shows current auto-scroll state
- **Instant Control**: Immediate response to user preferences

## User Interface

### Toggle Button

```
[🔄 Enable] / [⏸️ Disable]
```

- **Location**: Top-right of transcript viewer
- **Enable State**: Shows "🔄 Enable" when auto-scroll is disabled
- **Disable State**: Shows "⏸️ Disable" when auto-scroll is enabled

### Status Indicator

- **Active**: 🟢 "Auto-scroll" (green)
- **Paused**: 🟡 "Scroll paused" or "Paused (Xs)" (amber)

## How It Works

### 1. **Automatic Behavior**

```typescript
// Auto-scroll is enabled by default
autoScroll = true
isAutoScrollEnabled = true
```

### 2. **User Scroll Detection**

```typescript
// When user scrolls manually:
// 1. Auto-scroll pauses for 10 seconds
// 2. Countdown timer shows remaining time
// 3. Auto-scroll resumes automatically
```

### 3. **Manual Toggle**

```typescript
// When user clicks toggle button:
// 1. Immediately enables/disables auto-scroll
// 2. Clears any existing countdown
// 3. Updates visual indicators
```

## Implementation Details

### Component: `TranscriptViewer`

#### Props

```typescript
interface TranscriptViewerProps {
  autoScroll?: boolean // Default: true
  // ... other props
}
```

#### State Management

```typescript
const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll)
const [countdown, setCountdown] = useState(0)
```

#### Key Functions

- **`handleUserScroll()`**: Detects manual scrolling and pauses auto-scroll
- **Auto-scroll Effect**: Monitors active segment and scrolls when enabled
- **Toggle Handler**: Manual enable/disable control

### Scroll Behavior

```typescript
activeElement.scrollIntoView({
  behavior: 'smooth',
  block: 'center',
})
```

## User Experience Benefits

### 1. **Enhanced Video Following**

- Never lose track of current position in long transcripts
- Seamless reading experience during video playback
- Automatic synchronization reduces cognitive load

### 2. **User Control**

- Manual override when needed for detailed reading
- Smart pause detection respects user intent
- Quick toggle for different usage patterns

### 3. **Visual Feedback**

- Clear status indicators show current state
- Countdown timer for temporary pauses
- Smooth animations for state changes

## Usage Scenarios

### 1. **Active Viewing**

- **Auto-scroll ON**: Follow along with video playback
- **Best for**: First-time viewing, presentations, lectures

### 2. **Reference Reading**

- **Auto-scroll OFF**: Read at your own pace
- **Best for**: Detailed analysis, note-taking, research

### 3. **Mixed Usage**

- **Toggle as needed**: Switch between modes during playback
- **Best for**: Interactive learning, selective focus

## Technical Implementation

### Auto-Scroll Logic

```typescript
useEffect(() => {
  if (
    autoScroll &&
    isAutoScrollEnabled &&
    !isUserScrolling &&
    activeSegment &&
    containerRef.current
  ) {
    const activeElement = document.getElementById(`segment-${activeSegment.id}`)
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }
}, [activeSegment, autoScroll, isAutoScrollEnabled])
```

### User Scroll Detection

```typescript
const handleUserScroll = () => {
  if (!isAutoScrollEnabled) return

  const PAUSE_MS = 10_000
  pauseUntilRef.current = Date.now() + PAUSE_MS
  setIsAutoScrollEnabled(false)

  // Start countdown and re-enable timer
  startCountdownAndReenableTimer()
}
```

### Manual Toggle

```typescript
const toggleAutoScroll = () => {
  setIsAutoScrollEnabled(!isAutoScrollEnabled)
  setCountdown(0)
  pauseUntilRef.current = null
  clearTimeout(reenableTimeoutRef.current)
}
```

## Accessibility

### Keyboard Support

- Toggle button is keyboard accessible
- Focus management during scroll operations
- Screen reader announcements for state changes

### Visual Indicators

- High contrast status indicators
- Clear iconography (ScrollText, PauseCircle)
- Consistent color coding (green = active, amber = paused)

## Browser Compatibility

### Scroll Behavior

- Uses `scrollIntoView()` with smooth behavior
- Fallback for browsers without smooth scrolling
- Tested on Chrome, Firefox, Safari, Edge

### Performance

- Debounced scroll event handling
- Efficient DOM queries with element IDs
- Minimal re-renders with proper state management

## Future Enhancements

### Potential Improvements

1. **Scroll Speed Control**: Adjustable scroll animation speed
2. **Scroll Offset**: Customizable positioning (top, center, bottom)
3. **Keyboard Shortcuts**: Hotkeys for quick toggle
4. **Persistence**: Remember user preference across sessions
5. **Smart Pause**: Context-aware pause duration

### Advanced Features

1. **Predictive Scrolling**: Pre-scroll to upcoming segments
2. **Reading Speed Adaptation**: Adjust based on user reading patterns
3. **Multi-Speaker Focus**: Enhanced scrolling for dialogue
4. **Accessibility Options**: High contrast mode, reduced motion

## Troubleshooting

### Common Issues

#### Auto-scroll Not Working

- Check if `autoScroll` prop is enabled
- Verify active segment detection
- Ensure container ref is properly set

#### Scroll Too Aggressive

- User may have manually scrolled recently
- Check countdown timer status
- Verify smooth scroll behavior support

#### Toggle Button Not Responding

- Check event handler binding
- Verify state updates
- Ensure proper cleanup of timers

### Debug Information

```typescript
// Add to component for debugging
console.log({
  autoScroll,
  isAutoScrollEnabled,
  activeSegment: activeSegment?.id,
  countdown,
  pauseUntil: pauseUntilRef.current,
})
```

## Conclusion

The auto-scroll feature significantly enhances the ScriptFlow user experience by providing intelligent, user-controlled transcript following. The combination of automatic behavior, smart pause detection, and manual override gives users the flexibility to consume content in their preferred way while maintaining synchronization with video playback.
