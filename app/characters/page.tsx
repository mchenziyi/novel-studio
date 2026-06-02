'use client';

import { useState, useEffect } from 'react';
import { Character } from '@/types';
import { CharacterGraph } from '@/components/visualization/character-graph';
import { useNovel } from '@/lib/novel-context';

export default function CharactersPage() {
  const { currentNovelId } = useNovel();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  useEffect(() => {
    loadCharacters();
  }, [currentNovelId]);

  const loadCharacters = async () => {
    try {
      const response = await fetch(`/api/characters?novelId=${currentNovelId}`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    character.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive':
        return 'bg-green-100 text-green-800';
      case 'dead':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'protagonist':
        return 'bg-blue-100 text-blue-800';
      case 'antagonist':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">角色管理</h1>

      {/* 搜索 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <input
          type="text"
          placeholder="搜索角色名称或描述..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 角色关系图 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">角色关系图</h2>
        <CharacterGraph characters={filteredCharacters} loading={loading} />
      </div>

      <div className="flex gap-6">
        {/* 角色列表 */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 divide-y">
              {filteredCharacters.map((character) => (
                <div
                  key={character.id}
                  onClick={() => setSelectedCharacter(character)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedCharacter?.id === character.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                        {character.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{character.name}</div>
                        <div className="text-sm text-gray-500">
                          {character.description.substring(0, 50)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${getRoleColor(character.role)}`}
                      >
                        {character.role === 'protagonist'
                          ? '主角'
                          : character.role === 'antagonist'
                          ? '反派'
                          : '配角'}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${getStatusColor(character.status)}`}
                      >
                        {character.status === 'alive'
                          ? '存活'
                          : character.status === 'dead'
                          ? '死亡'
                          : '未知'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 角色详情 */}
        {selectedCharacter && (
          <div className="w-96">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                  {selectedCharacter.name.charAt(0)}
                </div>
                <h2 className="text-2xl font-bold">{selectedCharacter.name}</h2>
                <div className="flex justify-center space-x-2 mt-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${getRoleColor(selectedCharacter.role)}`}
                  >
                    {selectedCharacter.role === 'protagonist'
                      ? '主角'
                      : selectedCharacter.role === 'antagonist'
                      ? '反派'
                      : '配角'}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${getStatusColor(selectedCharacter.status)}`}
                  >
                    {selectedCharacter.status === 'alive'
                      ? '存活'
                      : selectedCharacter.status === 'dead'
                      ? '死亡'
                      : '未知'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">描述</div>
                  <p className="text-sm">{selectedCharacter.description}</p>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">首次出场</div>
                  <p className="text-sm">第{selectedCharacter.firstAppearance}章</p>
                </div>

                {selectedCharacter.lastAppearance && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">最后出场</div>
                    <p className="text-sm">第{selectedCharacter.lastAppearance}章</p>
                  </div>
                )}

                {selectedCharacter.relations.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-2">关系</div>
                    <div className="space-y-2">
                      {selectedCharacter.relations.map((relation, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm">{relation.target}</span>
                          <span className="text-xs text-gray-500">{relation.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 text-sm text-gray-500">
        共 {filteredCharacters.length} 个角色，{characters.length} 个角色总计
      </div>
    </div>
  );
}
