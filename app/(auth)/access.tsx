import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/sistema/seguridad';

export default function Access() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { loading, validateAccessCode } = useAuth();
  const disabled = useMemo(() => code.trim().length === 0, [code]);

  const onEnter = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return;
    setError(null);
    const res = await validateAccessCode(value);
    if (res.ok) {
      router.replace('/_role/roles');
    } else {
      setError(res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 520,
            backgroundColor: '#111827',
            padding: 28,
            borderRadius: 18,
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 12,
          }}
        >
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', textAlign: 'center' }}>
            Mi Negocio a un Click
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
            Introduce tu código para ingresar al sistema.
          </Text>

          <View style={{ height: 18 }} />

          <View
            style={{
              backgroundColor: '#0b1220',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="PUERTO-24"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ color: 'white', fontSize: 18 }}
              returnKeyType="done"
              onSubmitEditing={onEnter}
            />
          </View>

          <View style={{ height: 18 }} />

          <Pressable
            onPress={onEnter}
            disabled={disabled || loading}
            style={({ pressed }) => ({
              backgroundColor: disabled || loading ? '#3b82f680' : '#3b82f6',
              opacity: pressed ? 0.9 : 1,
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
            })}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
                Entrar al Panel
              </Text>
            )}
          </Pressable>

          {error ? (
            <Text style={{ color: '#f87171', textAlign: 'center', marginTop: 10 }}>{error}</Text>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
