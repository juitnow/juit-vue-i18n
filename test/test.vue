<template>
  <span id="t">{{ $t('hello') }}</span>
  <span id="tc0">{{ $tc('cats', 0) }}</span>
  <span id="tc1">{{ $tc('cats', 1) }}</span>
  <span id="tc2">{{ $tc('cats', 2) }}</span>
  <span id="d">{{ $d(date) }}</span>
  <span id="ddate">{{ $d(date, 'date') }}</span>
  <span id="dtime">{{ $d(date, 'time') }}</span>
  <span id="n">{{ $n(1234.56) }}</span>
</template>

<script setup lang="ts">
const date = new Date(1234567890123)
</script>
