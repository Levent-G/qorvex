import React, { memo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Parmağın değdiği anda tepki veren tuş (Pressable'ın gecikmesi yok)
function Key({ label, onDown, onUp, flex = 1, height }) {
  const [down, setDown] = useState(false);
  return (
    <View
      style={[styles.key, { height, flex }, down && { backgroundColor: colors.ink }]}
      onTouchStart={() => {
        setDown(true);
        onDown();
      }}
      onTouchEnd={() => {
        setDown(false);
        onUp && onUp();
      }}
      onTouchCancel={() => {
        setDown(false);
        onUp && onUp();
      }}
    >
      <Text allowFontScaling={false} style={[styles.keyText, flex > 1 && styles.wideText, down && { color: colors.paper }]}>
        {label}
      </Text>
    </View>
  );
}

// Gazete stili ekran klavyesi. Silme tuşu basılı tutulunca seri siler.
export default memo(function Keyboard({ onKey, onDelete, keyHeight = 44 }) {
  const timers = useRef({});
  const startDelete = () => {
    onDelete();
    clearTimeout(timers.current.t);
    clearInterval(timers.current.i);
    timers.current.t = setTimeout(() => {
      timers.current.i = setInterval(onDelete, 70);
    }, 350);
  };
  const stopDelete = () => {
    clearTimeout(timers.current.t);
    clearInterval(timers.current.i);
  };
  return (
    <View style={styles.wrap}>
      {ROWS.map((row, i) => (
        <View key={row} style={[styles.row, i === 1 && { paddingHorizontal: '4.5%' }]}>
          {row.split('').map((ch) => (
            <Key key={ch} label={ch} height={keyHeight} onDown={() => onKey(ch)} />
          ))}
          {i === 2 ? <Key label="⌫" flex={1.8} height={keyHeight} onDown={startDelete} onUp={stopDelete} /> : null}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 4, gap: 6 },
  row: { flexDirection: 'row', gap: 5 },
  key: {
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: '#FBF9F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  keyText: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.ink },
  wideText: { fontSize: 20 },
});
