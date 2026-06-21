import { useState, useCallback } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { userAPI } from '../../services/api';
import styles from './index.module.scss';

const tabs = [
  { key: 'cards', label: '我的会员卡' },
  { key: 'history', label: '消费记录' }
];

export default function MyCards() {
  const [activeTab, setActiveTab] = useState('cards');
  const [cards, setCards] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userAPI.getCards();
      setCards(data || []);
    } catch (error) {
      console.error('Load cards error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userAPI.getCardTransactions(1, 50);
      setTransactions(data.list || data || []);
    } catch (error) {
      console.error('Load transactions error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useDidShow(() => {
    if (activeTab === 'cards') {
      loadCards();
    } else {
      loadTransactions();
    }
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'cards') {
      loadCards();
    } else {
      loadTransactions();
    }
  };

  const getTransTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      purchase: '购卡充值',
      deduct: '签到扣次',
      refund: '退还次数',
      give: '赠送次数'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.replace('T', ' ').substring(0, 16);
  };

  const handleTransClick = (item: any) => {
    if (item && item.related_booking_id) {
      Taro.navigateTo({ url: `/pages/booking-detail/index?id=${item.related_booking_id}` });
    }
  };

  return (
    <View className={styles.container}>
      <View className={styles.tabs}>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.content}>
        {activeTab === 'cards' && (
          <View className={styles.cardList}>
            {cards.length === 0 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>💳</Text>
                <Text className={styles.emptyText}>暂无会员卡</Text>
              </View>
            ) : (
              cards.map(card => (
                <View
                  key={card.id}
                  className={`${styles.card} ${card.status !== 'active' ? styles.cardDisabled : ''}`}
                >
                  {card.status !== 'active' && (
                    <View className={styles.cardBadge}>已失效</View>
                  )}
                  <Text className={styles.cardName}>{card.name}</Text>
                  <View className={styles.cardStats}>
                    <Text className={styles.remaining}>{card.remaining_classes}</Text>
                    <Text className={styles.total}>/ {card.total_classes} 次</Text>
                  </View>
                  <Text className={styles.expireDate}>
                    有效期：{card.purchase_date} 至 {card.expire_date || '长期有效'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View className={styles.transactionSection}>
            <Text className={styles.sectionTitle}>卡消费明细</Text>
            {transactions.length === 0 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>📝</Text>
                <Text className={styles.emptyText}>暂无消费记录</Text>
              </View>
            ) : (
              <View className={styles.transList}>
                {transactions.map(item => (
                  <View 
                    key={item.id} 
                    className={`${styles.transItem} ${item.related_booking_id ? styles.transClickable : ''}`}
                    onClick={() => handleTransClick(item)}
                  >
                    <View className={styles.transInfo}>
                      <Text className={styles.transTitle}>
                        {item.course_name ? `${item.course_name} · ` : ''}{getTransTypeText(item.type)}
                      </Text>
                      <Text className={styles.transDesc}>
                        {item.coach_name ? `教练：${item.coach_name} · ` : ''}{item.remark || formatDate(item.created_at)}
                      </Text>
                      {item.related_booking_id && (
                        <Text className={styles.transLink}>点击查看课程详情 →</Text>
                      )}
                    </View>
                    <View style={{ textAlign: 'right' }}>
                      <Text
                        className={`${styles.transChange} ${
                          item.change_amount < 0 ? styles.transDeduct : styles.transAdd
                        }`}
                      >
                        {item.change_amount > 0 ? '+' : ''}
                        {item.change_amount} 次
                      </Text>
                      <Text className={styles.transBalance}>
                        剩余 {item.balance_after} 次
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
