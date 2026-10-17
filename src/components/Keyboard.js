import React, { memo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ed, efonts } from '../theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Parmağın değdiği anda tepki veren tuş (Pressable'ın gecikmesi yok)
function Key({ label, onDown, onUp, flex = 1, height, del }) {
  const [down, setDown] = useState(false);
  return (
    <View
      style={[styles.key, del && styles.delKey, { height, flex }, down && { backgroundColor: ed.primary }]}
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
      <Text allowFontScaling={false} style={[styles.keyText, del && styles.delText, down && { color: ed.onPrimary }]}>
        {label}
      </Text>
    </View>
  );
}

// Ekran klavyesi (gri panel, beyaz tuşlar). Silme tuşu basılı tutulunca seri siler.
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
          {i === 2 ? <Key label="⌫" flex={1.8} height={keyHeight} onDown={startDelete} onUp={stopDelete} del /> : null}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 8, padding: 6, gap: 6, backgroundColor: ed.surfaceDim, borderRadius: 14 },
  row: { flexDirection: 'row', gap: 5 },
  key: {
    backgroundColor: ed.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 1 },
  },
  delKey: { backgroundColor: ed.dangerSoft },
  keyText: { fontFamily: efonts.labelBold, fontSize: 17, color: ed.text },
  delText: { fontSize: 19, color: ed.danger },
});
