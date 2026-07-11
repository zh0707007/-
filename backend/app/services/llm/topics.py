TOPIC_DEFINITIONS = {
    "yongshen": {
        "title": "用神分析与排序",
        "sourceTitles": ["二、用神分析与排序"],
        "focus": "调候、扶抑、通关、五行喜忌排序、大运流年验证",
    },
    "shishen": {
        "title": "十神分析",
        "sourceTitles": ["三、十神分析"],
        "focus": "透干、藏干、十神组合、成格破格、现实表现",
    },
    "personality": {
        "title": "性格特征",
        "sourceTitles": ["四、性格特征"],
        "focus": "日主底色、月令环境、十神表达、压力来源、调整方向",
    },
    "career-wealth": {
        "title": "事业与财富",
        "sourceTitles": ["五、事业方向", "六、个人财富"],
        "focus": "事业赛道、能力模型、财富路径、风险边界、年份节奏",
    },
    "relationship": {
        "title": "婚姻情感",
        "sourceTitles": ["七、婚姻感情"],
        "focus": "配偶星、婚姻宫、关系模式、年份触发、沟通边界",
    },
    "health": {
        "title": "身体健康",
        "sourceTitles": ["八、身体健康"],
        "focus": "五行偏性、作息节律、压力反应、中性健康提醒",
    },
    "cities": {
        "title": "发展城市",
        "sourceTitles": ["九、适合发展的城市"],
        "focus": "喜用五行、气候环境、产业匹配、城市流动性",
    },
}


def get_topic_definition(topic_slug: str) -> dict | None:
    return TOPIC_DEFINITIONS.get(topic_slug)
